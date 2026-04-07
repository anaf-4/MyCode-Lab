-- MyCode Lab MySQL Schema
-- Run: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS mycode_lab
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mycode_lab;

-- Repositories table
CREATE TABLE IF NOT EXISTS repositories (
  id          VARCHAR(36)  PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  tags        JSON,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  file_count  INT          NOT NULL DEFAULT 0,
  total_size  BIGINT       NOT NULL DEFAULT 0,
  languages   JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Snippets table
CREATE TABLE IF NOT EXISTS snippets (
  id            VARCHAR(36)  PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  language      VARCHAR(50)  NOT NULL,
  code          LONGTEXT     NOT NULL,
  tags          JSON,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  repository_id VARCHAR(36),
  path          VARCHAR(1024),
  INDEX idx_repository (repository_id),
  INDEX idx_language (language),
  INDEX idx_updated (updated_at),
  FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Full-text search index
ALTER TABLE snippets ADD FULLTEXT INDEX ft_search (title, code);
