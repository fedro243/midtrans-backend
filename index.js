const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;

// Test endpoint
app.get("/", (req, res) => {
  res.send("Backend Midtrans jalan 🚀");
});

// Create transaction (QRIS Snap)
app.post("/create-transaction", async (req, res) => {
  try {
    console.log("REQ BODY:", req.body);

    const gross_amount = req.body.gross_amount || 50000;
    const order_id = req.body.order_id || "ORDER-" + Date.now();

    const response = await axios.post(
      "https://app.sandbox.midtrans.com/snap/v1/transactions",
      {
        transaction_details: {
          order_id: order_id,
          gross_amount: gross_amount
        },

      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization":
            "Basic " + Buffer.from(process.env.MIDTRANS_SERVER_KEY + ":").toString("base64")
        }
      }
    );

    res.json({
      order_id: order_id,
      redirect_url: response.data.redirect_url
    });

  } catch (error) {
    console.error("MIDTRANS ERROR:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || "Gagal buat transaksi" });
  }
});

// Webhook (opsional tapi penting nanti)
app.post("/midtrans-webhook", (req, res) => {
  console.log("Webhook masuk:", req.body);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log("Server jalan di port " + PORT);
});