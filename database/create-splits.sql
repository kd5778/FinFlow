-- Add Splitwise tables to FinFlow DB
-- Run: mysql -u root -p finflow_db < create-splits.sql
-- Or integrate into setup-db.js

CREATE TABLE IF NOT EXISTS splits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  creator_id INT NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  description VARCHAR(255),
  status ENUM('open', 'settled') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS split_shares (
  id INT AUTO_INCREMENT PRIMARY KEY,
  split_id INT NOT NULL,
  user_id INT NOT NULL,
  share_amount DECIMAL(12,2) NOT NULL,
  settled BOOLEAN DEFAULT FALSE,
  settled_at TIMESTAMP NULL,
  FOREIGN KEY (split_id) REFERENCES splits(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_share (split_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_splits_creator ON splits(creator_id);
CREATE INDEX idx_split_shares_split ON split_shares(split_id);
CREATE INDEX idx_split_shares_user ON split_shares(user_id);

-- Sample data (optional)
-- INSERT INTO splits (creator_id, total_amount, description) VALUES (1, 1000.00, 'Dinner split');
-- INSERT INTO split_shares (split_id, user_id, share_amount) VALUES (1, 1, 333.33), (1, 2, 333.33), (1, 3, 333.34);
