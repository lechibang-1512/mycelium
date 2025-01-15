const express = require('express');
const router = express.Router();
const pcBuildService = require('../services/PCBuildService');
const asyncHandler = require('../utils/asyncHandler');
const { requirePermission } = require('../middleware/rbacMiddleware');

// List builds
router.get('/', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
    const builds = await pcBuildService.getAllBuilds();
    res.json(builds);
}));

// Create build
router.post('/', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
    const newBuild = await pcBuildService.createBuild(req.body);
    res.status(201).json(newBuild);
}));

// Get build details
router.get('/:id', requirePermission('inventory:read'), asyncHandler(async (req, res) => {
    const build = await pcBuildService.getBuildById(req.params.id);
    if (!build) return res.status(404).json({ error: 'Build not found' });
    res.json(build);
}));

// Update build
router.put('/:id', requirePermission('inventory:write'), asyncHandler(async (req, res) => {
    const updatedBuild = await pcBuildService.updateBuild(req.params.id, req.body);
    if (!updatedBuild) return res.status(404).json({ error: 'Build not found' });
    res.json(updatedBuild);
}));

// Delete build (soft)
router.delete('/:id', requirePermission('inventory:delete'), asyncHandler(async (req, res) => {
    await pcBuildService.deleteBuild(req.params.id);
    res.json({ message: 'Build deleted successfully' });
}));

module.exports = router;
