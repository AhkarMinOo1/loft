const express = require('express');
const router = express.Router();
const Scene = require('../models/Scene');
const fs = require('fs').promises;
const path = require('path');

const STORAGE_PATH = path.join(__dirname, '../storage');

// Ensure storage directory exists
(async () => {
    try {
        await fs.mkdir(STORAGE_PATH, { recursive: true });
    } catch (err) {
        console.error('Error creating storage directory:', err);
    }
})();

// Get all scenes
router.get('/', async (req, res) => {
    try {
        const scenes = await Scene.find().sort({ updatedAt: -1 });
        res.json(scenes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get one scene
router.get('/:id', async (req, res) => {
    try {
        const scene = await Scene.findById(req.params.id);
        if (!scene) {
            return res.status(404).json({ message: 'Scene not found' });
        }
        res.json(scene);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create scene and save file
router.post('/', async (req, res) => {
    try {
        const scene = new Scene({
            name: req.body.name || `Scene ${Date.now()}`,
            data: req.body.data,
            version: req.body.version || 2
        });

        const newScene = await scene.save();

        // Save to file system
        const fileName = `scene_${newScene._id}.3dscene`;
        const filePath = path.join(STORAGE_PATH, fileName);
        await fs.writeFile(filePath, JSON.stringify(newScene, null, 2));

        res.status(201).json({
            ...newScene.toObject(),
            filePath: fileName
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Download scene file
router.get('/download/:id', async (req, res) => {
    try {
        const scene = await Scene.findById(req.params.id);
        if (!scene) {
            return res.status(404).json({ message: 'Scene not found' });
        }

        const fileName = `scene_${scene._id}.3dscene`;
        const filePath = path.join(STORAGE_PATH, fileName);

        // Check if file exists, if not create it
        try {
            await fs.access(filePath);
        } catch {
            await fs.writeFile(filePath, JSON.stringify(scene, null, 2));
        }

        res.download(filePath);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Load scene from file
router.post('/load-file/:id', async (req, res) => {
    try {
        const fileName = `scene_${req.params.id}.3dscene`;
        const filePath = path.join(STORAGE_PATH, fileName);
        
        const fileContent = await fs.readFile(filePath, 'utf8');
        const sceneData = JSON.parse(fileContent);
        
        res.json(sceneData);
    } catch (err) {
        res.status(404).json({ message: 'Scene file not found' });
    }
});

// Delete scene and its file
router.delete('/:id', async (req, res) => {
    try {
        const scene = await Scene.findById(req.params.id);
        if (!scene) {
            return res.status(404).json({ message: 'Scene not found' });
        }

        // Delete from database
        await scene.deleteOne();

        // Delete file if exists
        const fileName = `scene_${scene._id}.3dscene`;
        const filePath = path.join(STORAGE_PATH, fileName);
        try {
            await fs.unlink(filePath);
        } catch (err) {
            console.error('Error deleting file:', err);
        }

        res.json({ message: 'Scene deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;