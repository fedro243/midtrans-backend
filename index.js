const crypto = require("crypto");

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
       token: response.data.token,      
      redirect_url: response.data.redirect_url
    });

  } catch (error) {
    console.error("MIDTRANS ERROR:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || "Gagal buat transaksi" });
  }
});

app.post("/midtrans-webhook", (req, res) => {
  try {
    const notification = req.body;

    console.log("Webhook masuk:", notification);

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status
    } = notification;

    // 🔐 Verify Signature Key
    const hash = crypto
      .createHash("sha512")
      .update(order_id + status_code + gross_amount + process.env.MIDTRANS_SERVER_KEY)
      .digest("hex");

    if (hash !== signature_key) {
      console.log("❌ Signature tidak valid!");
      return res.status(403).json({ message: "Invalid signature" });
    }

    console.log("✅ Signature valid");

    // 🎯 Handle status transaksi
    if (transaction_status === "capture") {
      if (fraud_status === "challenge") {
        console.log(`⚠️ Order ${order_id} challenge fraud`);
      } else if (fraud_status === "accept") {
        console.log(`✅ Order ${order_id} berhasil (capture)`);
      }
    } 
    
    else if (transaction_status === "settlement") {
      console.log(`✅ Order ${order_id} sukses (settlement)`);
    } 
    
    else if (transaction_status === "pending") {
      console.log(`⏳ Order ${order_id} pending`);
    } 
    
    else if (transaction_status === "deny") {
      console.log(`❌ Order ${order_id} ditolak`);
    } 
    
    else if (transaction_status === "cancel" || transaction_status === "expire") {
      console.log(`❌ Order ${order_id} dibatalkan/expired`);
    } 
    
    else if (transaction_status === "refund") {
      console.log(`💸 Order ${order_id} refund`);
    }

    // 👉 Di sini nanti update database kamu
    // contoh:
    // await updateOrderStatus(order_id, transaction_status);

    res.sendStatus(200);

  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Webhook error" });
  }
});

app.listen(PORT, () => {
  console.log("Server jalan di port " + PORT);
});