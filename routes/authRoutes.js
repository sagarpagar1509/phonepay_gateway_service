require("dotenv").config();
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const { CLIENT_ID, CLIENT_SECRET, CLIENT_VERSION, BASE_URL } = process.env;

// Route to get authentication token
app.post("/get-auth-token", async (req, res) => {
    try {
        const params = new URLSearchParams();
        params.append("client_id", CLIENT_ID);
        params.append("client_version", CLIENT_VERSION);
        params.append("client_secret", CLIENT_SECRET);
        params.append("grant_type", "client_credentials");

        const response = await axios.post(
            `${BASE_URL}/v1/oauth/token`,
            params.toString(),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        const { access_token, token_type, expires_in } = response.data;

        if (!access_token || !token_type) {
            throw new Error("Invalid response from PhonePe API");
        }

        res.json({
            success: true,
            data: { accessToken: access_token, tokenType: token_type, expiresIn: expires_in }
        });
    } catch (error) {
        console.error("Error fetching auth token:", error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.response?.data || "Internal Server Error" });
    }
});

// Route to initiate payment
app.post("/initiate-payment", async (req, res) => {
    try {
        const { authorization } = req.headers;
        if (!authorization) return res.status(401).json({ success: false, error: "Authorization token missing" });

        const payload = {
            merchantOrderId: "TX123456",
            amount: 1000, // Amount in paisa (1000 paisa = ₹10)
            expireAfter: 1200, // Expiration time in seconds
            metaInfo: { udf1: "extra-info" },
            paymentFlow: {
                type: "PG_CHECKOUT",
                merchantUrls: { redirectUrl: "https://your-website.com/payment-success" }
            }
        };

        const response = await axios.post(
            `${BASE_URL}/checkout/v2/pay`,
            payload,
            { headers: { "Content-Type": "application/json", Authorization: `Bearer ${authorization}` }, timeout: 10000 }
        );

        res.json({ success: true, paymentData: response.data });
    } catch (error) {
        console.error("Payment Initiation Error:", error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.response?.data || "Internal Server Error" });
    }
});

// Route to check order status
app.get("/order-status/:merchantOrderId", async (req, res) => {
    try {
        const { authorization } = req.headers;
        const { merchantOrderId } = req.params;

        if (!authorization) return res.status(401).json({ success: false, error: "Authorization token missing" });

        const response = await axios.get(
            `${BASE_URL}/checkout/v2/order/${merchantOrderId}/status`,
            { headers: { "Content-Type": "application/json", Authorization: `Bearer ${authorization}` }, timeout: 10000 }
        );

        res.json({ success: true, orderStatus: response.data });
    } catch (error) {
        console.error("Order Status Error:", error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.response?.data || "Internal Server Error" });
    }
});

// Route to handle refunds
app.post("/refund", async (req, res) => {
    try {
        const { authorization } = req.headers;
        if (!authorization) return res.status(401).json({ success: false, error: "Authorization token missing" });

        const { transactionId, refundAmount } = req.body;

        const payload = {
            transactionId,
            refundAmount,
            refundId: `RF-${Date.now()}`,
            reason: "Customer Requested Refund"
        };

        const response = await axios.post(
            `${BASE_URL}/checkout/v2/refund`,
            payload,
            { headers: { "Content-Type": "application/json", Authorization: `Bearer ${authorization}` }, timeout: 10000 }
        );

        res.json({ success: true, refundData: response.data });
    } catch (error) {
        console.error("Refund Error:", error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.response?.data || "Internal Server Error" });
    }
});

// Route to check refund status
app.get("/refund-status/:refundId", async (req, res) => {
    try {
        const { authorization } = req.headers;
        const { refundId } = req.params;

        if (!authorization) return res.status(401).json({ success: false, error: "Authorization token missing" });

        const response = await axios.get(
            `${BASE_URL}/checkout/v2/refund/${refundId}/status`,
            { headers: { "Content-Type": "application/json", Authorization: `Bearer ${authorization}` }, timeout: 10000 }
        );

        res.json({ success: true, refundStatus: response.data });
    } catch (error) {
        console.error("Refund Status Error:", error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.response?.data || "Internal Server Error" });
    }
});

// Webhook to handle payment notifications
app.post("/webhook", async (req, res) => {
    try {
        console.log("Webhook received:", req.body);
        res.json({ success: true, message: "Webhook received successfully" });
    } catch (error) {
        console.error("Webhook Error:", error.message);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
