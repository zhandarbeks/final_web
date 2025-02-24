const mongoose = require('mongoose');

const fragranceSchema = new mongoose.Schema({
    name: String,
    gender: String,
    brand: String,
    scent: [String],
    sizes: Object,
    top_notes: [String],
    longevity: String,
    sillage: String,
    season: [String],
    image: String
});

const Fragrance = mongoose.models.Fragrance || mongoose.model('Fragrance', fragranceSchema);

module.exports = Fragrance;
