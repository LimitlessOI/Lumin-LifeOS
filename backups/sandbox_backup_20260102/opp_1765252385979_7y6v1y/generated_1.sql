CREATE TABLE IF NOT EXISTS `UserInteractions` (
  id SERIAL PRIMARY KEY AUTO_INCREMENT,
  contentId INT NOT NULL REFERENCES contents(`contentId`),
  userId BIGINT UNSIGNED DEFAULT NULL COMMENT 'The User ID',
  interactionTime TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP ON CONFLICT (`userId`, `interactionTime`) DO UPDATE SET ..., -- Update logic here if needed for handling duplicates or conflicts.
);