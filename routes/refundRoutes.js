const express = require("express");
const axios = require("axios");
require("dotenv").config();

const router = express.Router();

// Refund API
router.post("/initiate-refund", async (req, res) => {
    const { merchantOrderId, refundAmount, reason } = req.body;
    const accessToken = req.headers.authorization;

    try {
        const response = await axios.post(
            `${process.env.BASE_URL}/checkout/v1/refund`,
            {
                merchantOrderId,
                refundAmount,
                reason,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `O-Bearer ${accessToken}`,
                },
            }
        );

        res.json({ success: true, refundResponse: response.data });
    } catch (error) {
        console.error("Error initiating refund:", error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.response?.data || "Internal Server Error" });
    }
});

// Fetch Refund Status
router.get("/refund-status/:refundId", async (req, res) => {
    const { refundId } = req.params;
    const accessToken = req.headers.authorization;

    try {
        const response = await axios.get(
            `${process.env.BASE_URL}/checkout/v1/refund/status/${refundId}`,
            {
                headers: { Authorization: `O-Bearer ${accessToken}` },
            }
        );

        res.json({ success: true, refundStatus: response.data });
    } catch (error) {
        console.error("Error fetching refund status:", error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.response?.data || "Internal Server Error" });
    }
});

module.exports = router;
