const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    filename: String,
    category: {
        type: String,
        enum: ['PDFs', 'Certificates', 'Personal ID', 'Financial', 'Photos', 'Property', 'Vehicle', 'Travel']
    },
    subType:     { type: String, default: '' },
    description: { type: String, default: '' },
    issuedBy:    { type: String, default: '' },
    expiryDate:  { type: Date,   default: null },
    fileSize:    { type: Number, default: 0 },
    filePath: String,
    uploadDate: { type: Date, default: Date.now },
    shareToken: { type: String, default: null },
    versions: [
        {
            filePath:   String,
            fileSize:   Number,
            uploadDate: { type: Date, default: Date.now }
        }
    ]
});

module.exports = mongoose.model('Asset', AssetSchema);