const express = require("express");
const axios = require("axios");
require("dotenv").config();

const router = express.Router();

// Load environment variables
const BASE_URL = process.env.BASE_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox";
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CLIENT_VERSION = process.env.CLIENT_VERSION;

// Route to initiate payment (Token passed in headers)
router.post("/initiate-payment", async (req, res) => {
    try {
        const { authorization } = req.headers; // Get token from request headers

        if (!authorization) {
            return res.status(401).json({ success: false, error: "Authorization token missing" });
        }

        const payload = {
            merchantOrderId: "TX123456",
            amount: 1000,
            expireAfter: 1200,
            metaInfo: {
                udf1: "additional-information-1",
                udf2: "additional-information-2",
                udf3: "additional-information-3",
                udf4: "additional-information-4",
                udf5: "additional-information-5"
            },
            paymentFlow: {
                type: "PG_CHECKOUT",
                message: "Payment message used for collect requests",
                merchantUrls: {
                    redirectUrl: "https://your-website.com/payment-success"
                }
            }
        };

        // Make request to PhonePe API with token in headers
        const response = await axios.post(
            `${BASE_URL}/checkout/v2/pay`,
            payload,
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: authorization // Using token from request headers
                },
                timeout: 10000
            }
        );

        res.json({ success: true, paymentData: response.data });

    } catch (error) {
        console.error("Payment Initiation Error:", error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.response?.data || "Internal Server Error" });
    }
});



// Order Status API
router.get("/order-status/:merchantOrderId", async (req, res) => {
    try {
        const { authorization } = req.headers; // Get token from request headers
        const { merchantOrderId } = req.params; // Get order ID from params

        if (!authorization) {
            return res.status(401).json({ success: false, error: "Authorization token missing" });
        }

        // Make request to PhonePe API to check order status
        const response = await axios.get(
            `${BASE_URL}/checkout/v2/order/${merchantOrderId}/status`,
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `O-Bearer ${authorization}` // Updated Authorization format
                },
                timeout: 10000
            }
        );

        res.json({ success: true, orderStatus: response.data });
    } catch (error) {
        console.error("Order Status Error:", error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.response?.data || "Internal Server Error" });
    }
});




router.post("/get-auth-token", async (req, res) => {
    try {
        const params = new URLSearchParams();
        params.append("client_id", CLIENT_ID);
        params.append("client_version", CLIENT_VERSION);
        params.append("client_secret", CLIENT_SECRET);
        params.append("grant_type", GRANT_TYPE);

        const response = await axios.post(
            "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token",
            params.toString(), 
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        const { access_token, encrypted_access_token, expires_in, issued_at, expires_at, session_expires_at, token_type } = response.data;

        // Validate response structure
        if (!access_token || !token_type) {
            throw new Error("Invalid response from PhonePe API");
        }

        res.json({
            success: true,
            data: {
                accessToken: access_token,
                encryptedAccessToken: encrypted_access_token,
                expiresIn: expires_in,
                issuedAt: issued_at,
                expiresAt: expires_at,
                sessionExpiresAt: session_expires_at,
                tokenType: token_type,
            },
        });

    } catch (error) {
        console.error("Error fetching auth token:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: error.response?.data || "Internal Server Error",
        });
    }
});



module.exports = router;



// const express = require("express");
// const axios = require("axios");
// require("dotenv").config();

// const router = express.Router();

// const BASE_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";
// const CLIENT_ID = process.env.CLIENT_ID || "M22UC4M4A6T7GUAT_2503121042151075698658";
// const CLIENT_SECRET = process.env.CLIENT_SECRET || "ODZjZTE4MDMtY2UzZi00NmEwLWI4MDAtYmM1ZWU2ZWEyNTQx";
// const CLIENT_VERSION = process.env.CLIENT_VERSION || "1";


// router.post("/initiate-payment", async (req, res) => {
//     try {
       
//         const authToken = req.headers.authorization; 
//         if (!authToken) {
//             return res.status(401).json({ success: false, error: "Missing Authorization Token" });
//         }

       
//         const payload = {
//             merchantOrderId: `TXN_${Date.now()}`, 
//             amount: req.body.amount, 
//             expireAfter: 1200, 
//             metaInfo: {
//                 udf1: req.body.udf1 || "extra-info-1",
//                 udf2: req.body.udf2 || "extra-info-2",
//                 udf3: req.body.udf3 || "extra-info-3",
//                 udf4: req.body.udf4 || "extra-info-4",
//                 udf5: req.body.udf5 || "extra-info-5",
//             },
//             paymentFlow: {
//                 type: "PG_CHECKOUT",
//                 message: "Payment for Order TXN",
//                 merchantUrls: {
//                     redirectUrl: req.body.redirectUrl || "https://your-website.com/payment-success",
//                 },
//             },
//         };

       
//         const response = await axios.post(
//             `${BASE_URL}/checkout/v2/pay`,
//             payload,
//             {
//                 headers: {
//                     "Content-Type": "application/json",
//                     Authorization: authToken, 
//                 },
//                 timeout: 10000, 
//             }
//         );

        
//         res.json({ success: true, paymentData: response.data });

//     } catch (error) {
//         console.error("Payment Initiation Error:", error.response?.data || error.message);
//         res.status(500).json({ success: false, error: error.response?.data || "Internal Server Error" });
//     }
// });

// router.get("/order-status/:orderId", async (req, res) => {
//     const { orderId } = req.params;
//     const authToken = req.headers.authorization; 

//     if (!authToken || !authToken.startsWith("O-Bearer ")) {
//         return res.status(401).json({ success: false, error: "Unauthorized. Missing or invalid authentication token." });
//     }

//     console.log("🔍 Checking Order Status for:", orderId);

//     try {
        
//         const phonePeApiUrl = `${BASE_URL}/pg/v1/status/${orderId}`;

//         const headers = {
//             "Content-Type": "application/json",
//             Authorization: authToken,
//         };

    
//         const response = await axios.get(phonePeApiUrl, { headers, timeout: 10000 });

     
//         if (response.data && response.data.success) {
//             return res.json({ success: true, orderStatus: response.data });
//         } else {
//             return res.status(400).json({ success: false, error: "Invalid response from API", details: response.data });
//         }
//     } catch (error) {
//         console.error("❌ Order Status Error:", error.response?.data || error.message);
//         return res.status(500).json({ success: false, error: error.response?.data || "Internal Server Error" });
//     }
// });



