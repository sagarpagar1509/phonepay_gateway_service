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
app.use(cors());

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
          redirectUrl:
            "https://phonepay-gateway-service.onrender.com/payment-callback", // Redirect URL for user
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

app.get("/order-status/:orderId", async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const accessToken = await getAccessToken();

    // Fetch order status from PhonePe API
    const response = await axios.get(
      `${PHONEPE_ORDER_STATUS_URL}/${orderId}/status`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `O-Bearer ${accessToken}`,
        },
      }
    );

    // Log the full response for debugging
    console.log("Full Order Status Response:", JSON.stringify(response.data, null, 2));

    // Extract the status from the response
    const status = response.data?.data?.status; // Adjust this based on the actual response structure

    // Check if the status indicates success
    if (status && status.toUpperCase() === "COMPLETED") {
      // Redirect to the success page
      return res.redirect("https://successmarathi.vercel.app/success");
    } else {
      // Redirect to the failure page
      return res.redirect("https://successmarathi.vercel.app/failure");
    }
  } catch (error) {
    console.error("Error fetching order status:", error.response?.data || error.message);
    // Redirect to the failure page in case of an error
    return res.redirect("https://successmarathi.vercel.app/failure");
  }
});



// app.post("/payment-webhook", (req, res) => {
//   const paymentStatus = req.body; // Payment status from PhonePe

//   // Log the payment status for debugging
//   console.log("Payment Webhook Received (POST):", paymentStatus);

//   if (paymentStatus && paymentStatus.state === "SUCCESS") {
//     console.log("Payment successful for order:", paymentStatus.merchantOrderId);
//     // Process the successful payment (e.g., update database)
//   } else if (paymentStatus.state === "PENDING") {
//     console.log(
//       "Payment is still pending for order:",
//       paymentStatus.merchantOrderId
//     );
//     // Handle pending payment (You may want to retry later)
//   } else {
//     console.log("Payment failed for order:", paymentStatus.merchantOrderId);
//     // Handle failed payment
//   }

//   res.status(200).send("Webhook received");
// });

// // Handle GET requests to /payment-callback (for user redirection)
// app.get("/payment-callback", (req, res) => {

//   const queryParams = req.query;
//   console.log("Payment Callback Received (GET):", queryParams);

//   const { status, merchantOrderId } = req.query;

//   console.log("Payment Callback Received (GET):", { status, merchantOrderId });

//   if (status && status.toUpperCase() === "SUCCESS") {
//     // Redirect to the success page
//     return res.redirect("https://successmarathi.vercel.app/success");
//   } else {
//     // Redirect to the failure page
//     return res.redirect("https://successmarathi.vercel.app/failure");
//   }
// });

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
