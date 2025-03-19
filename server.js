const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(
  cors({
    origin: "https://successmarathi.vercel.app", // Replace with your frontend URL
    methods: ["GET", "POST", "OPTIONS"], // Allow these methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allow these headers
  })
);

// Handle preflight OPTIONS requests
app.options("*", cors()); // Enable preflight for all routes

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// PROD Endpoints
const PHONEPE_AUTH_URL =
  "https://api.phonepe.com/apis/identity-manager/v1/oauth/token";
const PHONEPE_PAYMENT_URL = "https://api.phonepe.com/apis/pg/checkout/v2/pay";
const PHONEPE_ORDER_STATUS_URL =
  "https://api.phonepe.com/apis/pg/checkout/v2/order";

// PROD Credentials
const PHONEPE_CLIENT_ID = process.env.PHONEPE_CLIENT_ID_PROD;
const PHONEPE_CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET_PROD;

// Validate Client ID and Secret
if (!PHONEPE_CLIENT_ID || !PHONEPE_CLIENT_SECRET) {
  console.error(
    "Error: Client ID or Client Secret is missing. Please check your .env file."
  );
  process.exit(1);
}

// Token caching
let accessToken = null;
let tokenExpiry = null;

// Fetch Access Token
const getAccessToken = async () => {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken; // Return cached token if not expired
  }

  const data = new URLSearchParams({
    client_id: PHONEPE_CLIENT_ID,
    client_version: 1,
    client_secret: PHONEPE_CLIENT_SECRET,
    grant_type: "client_credentials",
  });

  try {
    const response = await axios.post(PHONEPE_AUTH_URL, data, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    accessToken = response.data.access_token;
    tokenExpiry = Date.now() + response.data.expires_in * 1000; // Convert to milliseconds
    return accessToken;
  } catch (error) {
    console.error(
      "Error fetching access token:",
      error.response?.data || error.message
    );
    throw new Error("Failed to fetch access token");
  }
};

// Initiate Payment
app.post("/initiate-payment", async (req, res) => {
  try {
    const accessToken = await getAccessToken();
    const merchantOrderId = uuidv4(); // Generate a unique UUID
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount. Please enter a valid amount greater than 0.",
      });
    }

    const amountInPaise = Math.round(amount * 100); // Convert INR to paise
    const payload = {
      merchantOrderId: merchantOrderId,
      amount: amountInPaise, // Amount in paise (e.g., 1000 = ₹10)
      expireAfter: 900, // Expiry time in seconds (15 minutes)
      paymentFlow: {
        type: "PG_CHECKOUT",
        merchantUrls: {
          redirectUrl: "https://successmarathi.vercel.app/payment-callback", // Callback URL for webhook
          successUrl: "https://successmarathi.vercel.app/success", // Redirect URL for success
          failureUrl: "https://successmarathi.vercel.app/failure", // Redirect URL for failure
        },
      },
    };

    const response = await axios.post(PHONEPE_PAYMENT_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `O-Bearer ${accessToken}`,
      },
    });

    res.status(200).json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error(
      "Error initiating payment:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      message: "Payment initiation failed",
      error: error.response?.data || error.message,
    });
  }
});

// Check Order Status
app.get("/order-status/:orderId", async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const accessToken = await getAccessToken();

    const response = await axios.get(
      `${PHONEPE_ORDER_STATUS_URL}/${orderId}/status`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `O-Bearer ${accessToken}`,
        },
      }
    );

    res.status(200).json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error(
      "Error fetching order status:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      message: "Failed to fetch order status",
      error: error.response?.data || error.message,
    });
  }
});

// Webhook Handler
app.post("/payment-callback", (req, res) => {
  const paymentStatus = req.body;

  if (paymentStatus.status === "SUCCESS") {
    console.log("Payment successful for order:", paymentStatus.merchantOrderId);
    // Redirect to the success page
    res.redirect("https://successmarathi.vercel.app/success");
  } else {
    console.log("Payment failed for order:", paymentStatus.merchantOrderId);
    // Redirect to the failure page
    res.redirect("https://successmarathi.vercel.app/failure");
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});




// const express = require("express");
// const axios = require("axios");
// const bodyParser = require("body-parser");
// const dotenv = require("dotenv");
// const { v4: uuidv4 } = require("uuid");
// const cors = require("cors"); // Import the cors package

// // Load environment variables from .env file
// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 3001;

// // Enable CORS for all routes
// app.use(
//   cors({
//     origin: "https://successmarathi.vercel.app", // Replace with your frontend URL
//     methods: ["GET", "POST", "OPTIONS"], // Allow these methods
//     allowedHeaders: ["Content-Type", "Authorization"], // Allow these headers
//   })
// );

// // Handle preflight OPTIONS requests
// app.options("*", cors()); // Enable preflight for all routes

// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

// // PROD Endpoints
// const PHONEPE_AUTH_URL =
//   "https://api.phonepe.com/apis/identity-manager/v1/oauth/token";
// const PHONEPE_PAYMENT_URL = "https://api.phonepe.com/apis/pg/checkout/v2/pay";
// const PHONEPE_ORDER_STATUS_URL =
//   "https://api.phonepe.com/apis/pg/checkout/v2/order";

// // PROD Credentials
// const PHONEPE_CLIENT_ID = process.env.PHONEPE_CLIENT_ID_PROD;
// const PHONEPE_CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET_PROD;

// // Validate Client ID and Secret
// if (!PHONEPE_CLIENT_ID || !PHONEPE_CLIENT_SECRET) {
//   console.error(
//     "Error: Client ID or Client Secret is missing. Please check your .env file."
//   );
//   process.exit(1);
// }

// // Token caching
// let accessToken = null;
// let tokenExpiry = null;

// // Fetch Access Token
// const getAccessToken = async () => {
//   if (accessToken && Date.now() < tokenExpiry) {
//     return accessToken; // Return cached token if not expired
//   }

//   const data = new URLSearchParams({
//     client_id: PHONEPE_CLIENT_ID,
//     client_version: 1,
//     client_secret: PHONEPE_CLIENT_SECRET,
//     grant_type: "client_credentials",
//   });

//   try {
//     const response = await axios.post(PHONEPE_AUTH_URL, data, {
//       headers: {
//         "Content-Type": "application/x-www-form-urlencoded",
//       },
//     });
//     accessToken = response.data.access_token;
//     tokenExpiry = Date.now() + response.data.expires_in * 1000; // Convert to milliseconds
//     console.log("New access token generated:", accessToken);
//     return accessToken;
//   } catch (error) {
//     console.error(
//       "Error fetching access token:",
//       error.response?.data || error.message
//     );
//     throw new Error("Failed to fetch access token");
//   }
// };

// // Initiate Payment

// app.use(cors());
// // app.post("/initiate-payment", async (req, res) => {
// //   try {
// //     const accessToken = await getAccessToken();
// //     const merchantOrderId = uuidv4(); // Generate a unique UUID
// //     const { amount } = req.body;

// //     if (!amount || amount <= 0) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "Invalid amount. Please enter a valid amount greater than 0.",
// //       });
// //     }

// //     const amountInPaise = Math.round(amount * 100); // Convert INR to paise
// //     const payload = {
// //       merchantOrderId: merchantOrderId,
// //       amount: amountInPaise,  // Amount in paise (e.g., 1000 = ₹10)
// //       expireAfter: 900, // Expiry time in seconds (1 hour)
// //       metaInfo: {
// //         udf1: "Additional Info 1",
// //         udf2: "Additional Info 2",
// //       },
// //       paymentFlow: {
// //         type: "PG_CHECKOUT",
// //         message: "Payment for order " + merchantOrderId,
// //         merchantUrls: {
// //           redirectUrl: "https://successmarathi.vercel.app/payment-callback",
// //         },
// //       },
// //     };

// //     console.log("Initiating payment with payload:", payload);
// //     console.log("Using access token:", accessToken);

// //     const response = await axios.post(PHONEPE_PAYMENT_URL, payload, {
// //       headers: {
// //         "Content-Type": "application/json",
// //         Authorization: `O-Bearer ${accessToken}`,
// //       },
// //     });

// //     console.log("Payment Initiation Response:", response.data);
// //     res.status(200).json({
// //       success: true,
// //       data: response.data,
// //     });
// //   } catch (error) {
// //     console.error(
// //       "Error initiating payment:",
// //       error.response?.data || error.message
// //     );
// //     res.status(500).json({
// //       success: false,
// //       message: "Payment initiation failed",
// //       error: error.response?.data || error.message,
// //     });
// //   }
// // });

// app.post("/initiate-payment", async (req, res) => {
//   try {
//     const accessToken = await getAccessToken();
//     const merchantOrderId = uuidv4(); // Generate a unique UUID
//     const { amount } = req.body;

//     if (!amount || amount <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid amount. Please enter a valid amount greater than 0.",
//       });
//     }

//     const amountInPaise = Math.round(amount * 100); // Convert INR to paise
//     const payload = {
//       merchantOrderId: merchantOrderId,
//       amount: amountInPaise, // Amount in paise (e.g., 1000 = ₹10)
//       expireAfter: 900, // Expiry time in seconds (15 minutes)
//       paymentFlow: {
//         type: "PG_CHECKOUT",
//         merchantUrls: {
//           redirectUrl: "https://successmarathi.vercel.app/payment-callback", // Callback URL for webhook
//           successUrl: "https://successmarathi.vercel.app/success", // Redirect URL for success
//           failureUrl: "https://successmarathi.vercel.app/failure", // Redirect URL for failure
//         },
//       },
//     };

//     const response = await axios.post(PHONEPE_PAYMENT_URL, payload, {
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `O-Bearer ${accessToken}`,
//       },
//     });

//     res.status(200).json({
//       success: true,
//       data: response.data,
//     });
//   } catch (error) {
//     console.error(
//       "Error initiating payment:",
//       error.response?.data || error.message
//     );
//     res.status(500).json({
//       success: false,
//       message: "Payment initiation failed",
//       error: error.response?.data || error.message,
//     });
//   }
// });

// // Check Order Status
// // app.get("/order-status/:orderId", async (req, res) => {
// //   try {
// //     const orderId = req.params.orderId;
// //     const accessToken = await getAccessToken();

// //     console.log("Fetching order status for orderId:", orderId);
// //     console.log("Using accessToken:", accessToken);

// //     const response = await axios.get(
// //       `${PHONEPE_ORDER_STATUS_URL}/${orderId}/status`,
// //       {
// //         headers: {
// //           "Content-Type": "application/json",
// //           Authorization: `O-Bearer ${accessToken}`,
// //         },
// //       }
// //     );

// //     console.log("Order Status API Response:", response.data);
// //     res.status(200).json({
// //       success: true,
// //       data: response.data,
// //     });
// //   } catch (error) {
// //     console.error(
// //       "Error fetching order status:",
// //       error.response?.data || error.message
// //     );
// //     res.status(500).json({
// //       success: false,
// //       message: "Failed to fetch order status",
// //       error: error.response?.data || error.message,
// //     });
// //   }
// // });
// app.get("/order-status/:orderId", async (req, res) => {
//   try {
//     const orderId = req.params.orderId;
//     const accessToken = await getAccessToken();

//     const response = await axios.get(
//       `${PHONEPE_ORDER_STATUS_URL}/${orderId}/status`,
//       {
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `O-Bearer ${accessToken}`,
//         },
//       }
//     );

//     res.status(200).json({
//       success: true,
//       data: response.data,
//     });
//   } catch (error) {
//     console.error(
//       "Error fetching order status:",
//       error.response?.data || error.message
//     );
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch order status",
//       error: error.response?.data || error.message,
//     });
//   }
// });

// // Webhook Handler
// app.post("/payment-callback", (req, res) => {
//   const paymentStatus = req.body;
//   console.log("Payment Status Webhook Received:", paymentStatus);

//   if (paymentStatus.status === "SUCCESS") {
//     console.log("Payment successful for order:", paymentStatus.merchantOrderId);
//   } else {
//     console.log("Payment failed for order:", paymentStatus.merchantOrderId);
//   }

//   res.status(200).send("Webhook received");
// });

// // Start the server
// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });
