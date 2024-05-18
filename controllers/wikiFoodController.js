// controllers/wikifoodController.js
const Wikifood = require('../models/wikifood');


exports.createWikiFood = async (req, res) => {
    const { title, text, source } = req.body;
    console.log('Get From Flutter : ', title, text, source )
    try {
        const newWikiFood = new Wikifood({
            title,
            text,
            source,
        });

        const savedWikiFood = await newWikiFood.save();

        res.status(201).json(savedWikiFood);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.updateWikiFood = async (req, res) => {
    const wikifoodId = req.params.id;
    try {
        const updatedwikifood = await Wikifood.findByIdAndUpdate(
            wikifoodId,
            { $set: req.body },
            { new: true }
        );
        res.status(200).json(updatedwikifood);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteWikiFood = async (req, res) => {
    try {
        const wikifoodId = req.params.id;
        await Wikifood.findByIdAndDelete(wikifoodId);
        res.status(200).json({ message: "wikifood deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.searchWikiFoodByTitle = async (req, res) => {
    try {
        const query = req.query.query || '';
        if (!query.trim()) {
            return res.status(400).json({ message: 'Empty query provided' });
        }

        const regex = new RegExp(query, 'i'); // 'i' makes it case-insensitive
        const wikifood = await Wikifood.findOne({ title: { $regex: regex } });

        console.log('The word got from Flutter is:', query);
        console.log('Regex is:', regex);
        console.log('Found:', wikifood);

        if (wikifood) {
            res.json({ wikifood });
        } else {
            res.status(404).json({ message: 'No wikifood found for this query' });
        }
    } catch (error) {
        console.error('Search wikifood error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching wikifood',
            error
        });
    }
};



exports.getWikiFoodsByPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const skip = (page - 1) * pageSize;

        const total = await Wikifood.countDocuments();
        const wikifoods = await Wikifood.find().skip(skip).limit(pageSize);

        res.json({
            total,
            page,
            pageSize,
            wikifoods,
        });
    } catch (error) {
        console.error('Error fetching wikifoods:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching wikifoods',
            error
        });
    }
};
