/**
 * ClipLibraryManager - Abstraction layer for clip library storage
 * 
 * This module provides a consistent interface for clip storage operations
 * while currently using in-memory storage. Future implementations can swap
 * the underlying storage mechanism without changing the API.
 * 
 * Current: In-memory array with optional auto-load from test-videos/
 * Future: localStorage, IndexedDB, SQLite, or cloud storage
 */

class ClipLibraryManager {
  constructor(options = {}) {
    this.clips = [];
    this.clipIdCounter = 0;
    this.config = {
      autoLoadTestVideos: options.autoLoadTestVideos || false,
      testVideosPath: options.testVideosPath || null,
      persistenceEnabled: options.persistenceEnabled || false
    };
  }

  async getDefaultTestVideosPath() {
    const appPath = await window.electronAPI.getAppPath();
    return window.electronAPI.pathJoin(appPath, 'test-videos');
  }

  /**
   * Initialize the library - loads from storage if persistence enabled
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.config.persistenceEnabled) {
      await this.loadFromStorage();
    }
    
    if (this.config.autoLoadTestVideos) {
      await this.loadTestVideos();
    }
  }

  /**
   * Load clips from persistent storage (currently no-op, future: localStorage/DB)
   * @returns {Promise<void>}
   */
  async loadFromStorage() {
    // TODO: Implement when persistence layer is ready
    // Example future implementation:
    // const stored = localStorage.getItem('clipLibrary');
    // if (stored) {
    //   const data = JSON.parse(stored);
    //   this.clips = data.clips;
    //   this.clipIdCounter = data.clipIdCounter;
    // }
    return Promise.resolve();
  }

  /**
   * Save clips to persistent storage (currently no-op, future: localStorage/DB)
   * @returns {Promise<void>}
   */
  async saveToStorage() {
    // TODO: Implement when persistence layer is ready
    // Example future implementation:
    // const data = {
    //   clips: this.clips,
    //   clipIdCounter: this.clipIdCounter
    // };
    // localStorage.setItem('clipLibrary', JSON.stringify(data));
    return Promise.resolve();
  }

  /**
   * Auto-load test videos from test-videos directory
   * @returns {Promise<void>}
   */
  async loadTestVideos() {
    try {
      if (!this.config.testVideosPath) {
        this.config.testVideosPath = await this.getDefaultTestVideosPath();
      }

      const files = await window.electronAPI.readDirectory(this.config.testVideosPath);
      const videoFiles = files.filter(file => 
        /\.(mp4|mov|webm)$/i.test(file)
      );

      for (const file of videoFiles) {
        const fullPath = window.electronAPI.pathJoin(this.config.testVideosPath, file);
        await this.addClip(fullPath);
      }
      
      console.log(`Auto-loaded ${videoFiles.length} test videos from ${this.config.testVideosPath}`);
    } catch (error) {
      console.warn('Could not auto-load test videos:', error.message);
    }
  }

  /**
   * Add a clip to the library
   * @param {string} videoPath - Full path to video file
   * @param {Object} metadata - Optional metadata (name, tags, etc.)
   * @returns {Promise<Object>} The created clip object
   */
  async addClip(videoPath, metadata = {}) {
    const fileName = window.electronAPI.pathBasename(videoPath);
    
    const clip = {
      id: this.clipIdCounter++,
      path: videoPath,
      name: metadata.name || fileName,
      duration: 0,
      dateAdded: new Date().toISOString(),
      tags: metadata.tags || [],
      thumbnail: metadata.thumbnail || null
    };

    this.clips.push(clip);
    
    if (this.config.persistenceEnabled) {
      await this.saveToStorage();
    }

    return clip;
  }

  /**
   * Get metadata for a clip (duration, resolution, etc.)
   * Uses HTML5 video element to extract metadata
   * @param {Object} clip - Clip object
   * @returns {Promise<Object>} Updated clip with metadata
   */
  async getClipMetadata(clip) {
    return new Promise((resolve) => {
      const tempVideo = document.createElement('video');
      tempVideo.src = `file://${clip.path}`;
      tempVideo.addEventListener('loadedmetadata', () => {
        clip.duration = tempVideo.duration;
        clip.width = tempVideo.videoWidth;
        clip.height = tempVideo.videoHeight;
        resolve(clip);
      });
      tempVideo.addEventListener('error', () => {
        console.warn(`Failed to load metadata for ${clip.path}`);
        resolve(clip);
      });
    });
  }

  /**
   * Remove a clip from the library
   * @param {number} clipId - ID of clip to remove
   * @returns {Promise<boolean>} Success status
   */
  async removeClip(clipId) {
    const index = this.clips.findIndex(c => c.id === clipId);
    if (index === -1) return false;

    this.clips.splice(index, 1);
    
    if (this.config.persistenceEnabled) {
      await this.saveToStorage();
    }

    return true;
  }

  /**
   * Get all clips in the library
   * @returns {Array<Object>} Array of clip objects
   */
  getAllClips() {
    return [...this.clips];
  }

  /**
   * Get a single clip by ID
   * @param {number} clipId - ID of clip
   * @returns {Object|null} Clip object or null if not found
   */
  getClipById(clipId) {
    return this.clips.find(c => c.id === clipId) || null;
  }

  /**
   * Search clips by name or tags
   * @param {string} query - Search query
   * @returns {Array<Object>} Matching clips
   */
  searchClips(query) {
    const lowerQuery = query.toLowerCase();
    return this.clips.filter(clip => 
      clip.name.toLowerCase().includes(lowerQuery) ||
      clip.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Clear all clips from the library
   * @returns {Promise<void>}
   */
  async clearLibrary() {
    this.clips = [];
    this.clipIdCounter = 0;
    
    if (this.config.persistenceEnabled) {
      await this.saveToStorage();
    }
  }

  /**
   * Get library statistics
   * @returns {Object} Statistics object
   */
  getStatistics() {
    return {
      totalClips: this.clips.length,
      totalDuration: this.clips.reduce((sum, clip) => sum + clip.duration, 0),
      oldestClip: this.clips.length > 0 ? this.clips[0].dateAdded : null,
      newestClip: this.clips.length > 0 ? this.clips[this.clips.length - 1].dateAdded : null
    };
  }
}

// Export for use in renderer process
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClipLibraryManager;
}
