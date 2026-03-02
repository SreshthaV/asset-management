const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
    filename: String,
    category: { 
        type: String, 
        enum: ['PDFs', 'Certificates', 'Personal ID', 'Financial', 'Photos', 'Classifications'] 
    },
    filePath: String,
    uploadDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Asset', AssetSchema);