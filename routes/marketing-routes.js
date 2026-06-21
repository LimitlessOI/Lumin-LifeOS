/**
 * SYNOPSIS: Registers MarketingRoutes routes/handlers (routes/marketing-routes.js).
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

/**
 * Registers all Phase 1 MarketingOS / SocialMediaOS routes.
 * This module defines endpoints for managing social media posts,
 * marketing campaigns, and scheduling within the LifeOS platform.
 *
 * @param {object} app - The Express application or router instance to which routes will be mounted.
 */
export function registerMarketingRoutes(app) {
  // In-memory store for demonstration purposes.
  // In a real application, these would interact with a database or a dedicated service.
  const posts = [];
  const campaigns = [];
  const scheduledItems = [];
  let postIdCounter = 1;
  let campaignIdCounter = 1;
  let scheduleIdCounter = 1;

  /**
   * Handles the creation of a new social media post.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  const createPost = (req, res) => {
    const { title, content, platform, scheduledFor } = req.body;
    if (!title || !content || !platform) {
      return res.status(400).json({ message: 'Missing required fields: title, content, platform' });
    }
    const newPost = {
      id: String(postIdCounter++),
      title,
      content,
      platform,
      scheduledFor: scheduledFor || null,
      createdAt: new Date().toISOString(),
      status: 'draft'
    };
    posts.push(newPost);
    res.status(201).json({ message: 'Post created successfully', post: newPost });
  };

  /**
   * Retrieves all social media posts.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  const getAllPosts = (req, res) => {
    res.status(200).json(posts);
  };

  /**
   * Retrieves a specific social media post by ID.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  const getPostById = (req, res) => {
    const { id } = req.params;
    const post = posts.find(p => p.id === id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(200).json(post);
  };

  /**
   * Updates an existing social media post by ID.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  const updatePost = (req, res) => {
    const { id } = req.params;
    const { title, content, platform, scheduledFor, status } = req.body;
    const postIndex = posts.findIndex(p => p.id === id);
    if (postIndex === -1) {
      return res.status(404).json({ message: 'Post not found' });
    }
    const updatedPost = {
      ...posts[postIndex],
      title: title ?? posts[postIndex].title,
      content: content ?? posts[postIndex].content,
      platform: platform ?? posts[postIndex].platform,
      scheduledFor: scheduledFor ?? posts[postIndex].scheduledFor,
      status: status ?? posts[postIndex].status,
      updatedAt: new Date().toISOString()
    };
    posts[postIndex] = updatedPost;
    res.status(200).json({ message: 'Post updated successfully', post: updatedPost });
  };

  /**
   * Deletes a social media post by ID.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  const deletePost = (req, res) => {
    const { id } = req.params;
    const initialLength = posts.length;
    const filteredPosts = posts.filter(p => p.id !== id);
    if (filteredPosts.length === initialLength) {
      return res.status(404).json({ message: 'Post not found' });
    }
    // Modify the original array in place as it's a const reference to the array.
    posts.splice(0, posts.length, ...filteredPosts);
    res.status(204).send(); // No content on successful delete
  };

  /**
   * Handles the creation of a new marketing campaign.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  const createCampaign = (req, res) => {
    const { name, description, startDate, endDate, targetAudience } = req.body;
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing required fields: name, startDate, endDate' });
    }
    const newCampaign = {
      id: String(campaignIdCounter++),
      name,
      description: description || '',
      startDate,
      endDate,
      targetAudience: targetAudience || [],
      createdAt: new Date().toISOString(),
      status: 'planned'
    };
    campaigns.push(newCampaign);
    res.status(201).json({ message: 'Campaign created successfully', campaign: newCampaign });
  };

  /**
   * Retrieves all marketing campaigns.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  const getAllCampaigns = (req, res) => {
    res.status(200).json(campaigns);
  };

  /**
   * Retrieves a specific marketing campaign by ID.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  const getCampaignById = (req, res) => {
    const { id } = req.params;
    const campaign = campaigns.find(c => c.id === id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    res.status(200).json(campaign);
  };

  /**
   * Updates an existing marketing campaign by ID.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  const updateCampaign = (req, res) => {
    const { id } = req.params;
    const { name, description, startDate, endDate, targetAudience, status } = req.body;
    const campaignIndex = campaigns.findIndex(c => c.id === id);
    if (campaignIndex === -1) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    const updatedCampaign = {
      ...campaigns[campaignIndex],
      name: name ?? campaigns[campaignIndex].name,
      description: description ?? campaigns[campaignIndex].description,
      startDate: startDate ?? campaigns[campaignIndex].startDate,
      endDate: endDate ?? campaigns[campaignIndex].endDate,
      targetAudience: targetAudience ?? campaigns[campaignIndex].targetAudience,
      status: status ?? campaigns[campaignIndex].status,
      updatedAt: new Date().toISOString()
    };
    campaigns[campaignIndex] = updatedCampaign;
    res.status(200).json({ message: 'Campaign updated successfully', campaign: updatedCampaign });
  };

  /**
   * Deletes a marketing campaign by ID.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  const deleteCampaign = (req, res) => {
    const { id } = req.params;
    const initialLength = campaigns.length;
    const filteredCampaigns = campaigns.filter(c => c.id !== id);
    if (filteredCampaigns.length === initialLength) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    campaigns.splice(0, campaigns.length, ...filteredCampaigns);
    res.status(204).send();
  };

  /**
   * Schedules a post or campaign for future publication.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  const scheduleItem = (req, res) => {
    const { itemId, itemType, scheduleTime, platform } = req.body;
    if (!itemId || !itemType || !scheduleTime || !platform) {
      return res.status(400).json({ message: 'Missing required fields: itemId, itemType, scheduleTime, platform' });
    }
    const newItem = {
      id: String(scheduleIdCounter++),
      itemId,
      itemType, // e.g., 'post', 'campaign'
      scheduleTime,
      platform,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    scheduledItems.push(newItem);
    res.status(201).json({ message: 'Item scheduled successfully', schedule: newItem });
  };

  /**
   * Retrieves all scheduled items.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  const getScheduledItems = (req, res) => {
    res.status(200).json(scheduledItems);
  };

  // Mount routes
  app.post('/marketing/posts', createPost);
  app.get('/marketing/posts', getAllPosts);
  app.get('/marketing/posts/:id', getPostById);
  app.put('/marketing/posts/:id', updatePost);
  app.delete('/marketing/posts/:id', deletePost);

  app.post('/marketing/campaigns', createCampaign);
  app.get('/marketing/campaigns', getAllCampaigns);
  app.get('/marketing/campaigns/:id', getCampaignById);
  app.put('/marketing/campaigns/:id', updateCampaign);
  app.delete('/marketing/campaigns/:id', deleteCampaign);

  app.post('/marketing/schedule', scheduleItem);
  app.get('/marketing/schedule', getScheduledItems);
}