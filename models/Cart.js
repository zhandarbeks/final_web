const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fragranceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fragrance', required: true },
    size: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, default: 1 }
});

const Cart = mongoose.model('Cart', cartItemSchema);
module.exports = Cart;
