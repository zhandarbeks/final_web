const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Fragrance = require('../models/Fragrance');
const requireAuth = require('../middleware/auth'); // Ensure user is logged in

// Add to Cart
router.post('/add/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const fragranceId = req.params.id;
        const { size } = req.body;

        const fragrance = await Fragrance.findById(fragranceId);
        if (!fragrance) return res.status(404).send('Fragrance not found');

        const price = fragrance.sizes[size];
        if (!price) return res.status(400).send('Invalid size');

        let cartItem = await Cart.findOne({ userId, fragranceId, size });

        if (cartItem) {
            cartItem.quantity += 1;
        } else {
            cartItem = new Cart({ userId, fragranceId, size, price, quantity: 1 });
        }

        await cartItem.save();
        res.redirect('/cart');
    } catch (err) {
        console.error('Error adding to cart:', err);
        res.status(500).send('Internal Server Error');
    }
});

// View Cart
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const cart = await Cart.find({ userId }).populate('fragranceId');

        res.render('cart', { cart });
    } catch (err) {
        console.error('Error fetching cart:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Remove Item from Cart
router.post('/remove/:id', requireAuth, async (req, res) => {
    try {
        const cartItemId = req.params.id;
        await Cart.findByIdAndDelete(cartItemId);
        res.redirect('/cart');
    } catch (err) {
        console.error('Error removing item from cart:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Checkout (Clear Cart)
router.post('/checkout', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        await Cart.deleteMany({ userId });

        res.redirect('/checkout-success');
    } catch (err) {
        console.error('Error during checkout:', err);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
