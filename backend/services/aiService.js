const natural = require('natural');
const sentiment = require('sentiment');
const { query } = require('../config/sqlite');

const sentimentAnalyzer = new sentiment();

// Analyze sentiment of complaint text
const analyzeSentiment = async (text) => {
  try {
    const result = sentiment.analyze(text);
    
    // Normalize score to 0-1 scale
    let normalizedScore = (result.score + 10) / 20; // Rough normalization
    normalizedScore = Math.max(0, Math.min(1, normalizedScore));
    
    return parseFloat(normalizedScore.toFixed(2));
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return 0.5; // Neutral sentiment as fallback
  }
};

// Calculate text similarity using Jaro-Winkler distance
const calculateSimilarity = (text1, text2) => {
  try {
    return natural.JaroWinklerDistance(text1.toLowerCase(), text2.toLowerCase());
  } catch (error) {
    console.error('Similarity calculation error:', error);
    return 0;
  }
};

// Extract keywords from text
const extractKeywords = (text) => {
  try {
    const tokens = natural.WordTokenizer().tokenize(text.toLowerCase());
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'shall']);
    
    const keywords = tokens
      .filter(token => token.length > 2 && !stopWords.has(token))
      .slice(0, 10); // Take top 10 keywords
    
    return keywords;
  } catch (error) {
    console.error('Keyword extraction error:', error);
    return [];
  }
};

// Find similar complaints based on text similarity and category
const findSimilarComplaints = async (description, category, threshold = 0.6) => {
  try {
    // Get existing complaints in the same category
    const existingComplaints = await query(
      'SELECT id, title, description FROM complaints WHERE category = ?',
      [category]
    );

    const similarComplaints = [];
    
    for (const complaint of existingComplaints.rows) {
      // Calculate similarity for both title and description
      const titleSimilarity = calculateSimilarity(description, complaint.title);
      const descriptionSimilarity = calculateSimilarity(description, complaint.description);
      
      // Take the higher similarity score
      const maxSimilarity = Math.max(titleSimilarity, descriptionSimilarity);
      
      if (maxSimilarity >= threshold) {
        similarComplaints.push({
          id: complaint.id,
          title: complaint.title,
          description: complaint.description,
          similarity: parseFloat(maxSimilarity.toFixed(2))
        });
      }
    }

    // Sort by similarity (highest first) and return top 5
    return similarComplaints
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
      
  } catch (error) {
    console.error('Error finding similar complaints:', error);
    return [];
  }
};

// Advanced text preprocessing for better similarity detection
const preprocessText = (text) => {
  try {
    // Convert to lowercase
    let processed = text.toLowerCase();
    
    // Remove special characters but keep spaces
    processed = processed.replace(/[^\w\s]/gi, ' ');
    
    // Remove extra whitespace
    processed = processed.replace(/\s+/g, ' ').trim();
    
    // Stem words to their root form
    const tokens = natural.WordTokenizer().tokenize(processed);
    const stemmedTokens = tokens.map(token => natural.PorterStemmer.stem(token));
    
    return stemmedTokens.join(' ');
  } catch (error) {
    console.error('Text preprocessing error:', error);
    return text;
  }
};

// Enhanced similarity detection with preprocessing
const findSimilarComplaintsAdvanced = async (description, category, threshold = 0.7) => {
  try {
    const processedDescription = preprocessText(description);
    const descriptionKeywords = extractKeywords(description);
    
    // Get existing complaints in the same category
    const existingComplaints = await query(
      'SELECT id, title, description FROM complaints WHERE category = ?',
      [category]
    );

    const similarComplaints = [];
    
    for (const complaint of existingComplaints) {
      const processedTitle = preprocessText(complaint.title);
      const processedComplaintDesc = preprocessText(complaint.description);
      const complaintKeywords = extractKeywords(complaint.description);
      
      // Calculate multiple similarity metrics
      const titleSimilarity = calculateSimilarity(processedDescription, processedTitle);
      const descriptionSimilarity = calculateSimilarity(processedDescription, processedComplaintDesc);
      
      // Calculate keyword overlap
      const keywordIntersection = descriptionKeywords.filter(keyword => 
        complaintKeywords.includes(keyword)
      );
      const keywordSimilarity = keywordIntersection.length / 
        Math.max(descriptionKeywords.length, complaintKeywords.length, 1);
      
      // Weighted combination of similarities
      const combinedSimilarity = (
        titleSimilarity * 0.3 + 
        descriptionSimilarity * 0.5 + 
        keywordSimilarity * 0.2
      );
      
      if (combinedSimilarity >= threshold) {
        similarComplaints.push({
          id: complaint.id,
          title: complaint.title,
          description: complaint.description,
          similarity: parseFloat(combinedSimilarity.toFixed(2)),
          titleSimilarity: parseFloat(titleSimilarity.toFixed(2)),
          descriptionSimilarity: parseFloat(descriptionSimilarity.toFixed(2)),
          keywordSimilarity: parseFloat(keywordSimilarity.toFixed(2))
        });
      }
    }

    // Sort by similarity and return top 5
    return similarComplaints
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
      
  } catch (error) {
    console.error('Error in advanced similar complaints detection:', error);
    return await findSimilarComplaints(description, category, threshold); // Fallback to basic method
  }
};

// Classify complaint urgency based on sentiment and keywords
const classifyUrgency = (description, sentimentScore) => {
  try {
    const urgentKeywords = [
      'urgent', 'emergency', 'critical', 'serious', 'dangerous', 'immediate',
      'harassment', 'bullying', 'assault', 'threat', 'safety', 'health',
      'discrimination', 'violation', 'abuse'
    ];
    
    const hasUrgentKeywords = urgentKeywords.some(keyword => 
      description.toLowerCase().includes(keyword)
    );
    
    // Low sentiment (negative) + urgent keywords = high urgency
    if (sentimentScore < 0.3 && hasUrgentKeywords) {
      return 'Critical';
    } else if (sentimentScore < 0.4 || hasUrgentKeywords) {
      return 'High';
    } else if (sentimentScore < 0.6) {
      return 'Medium';
    } else {
      return 'Low';
    }
  } catch (error) {
    console.error('Urgency classification error:', error);
    return 'Medium'; // Default to medium urgency
  }
};

// Generate AI insights for a complaint
const generateComplaintInsights = async (description, category) => {
  try {
    const sentimentScore = await analyzeSentiment(description);
    const urgency = classifyUrgency(description, sentimentScore);
    const keywords = extractKeywords(description);
    const similarComplaints = await findSimilarComplaintsAdvanced(description, category);
    
    return {
      sentimentScore,
      urgency,
      keywords,
      similarComplaints,
      insights: {
        isDuplicate: similarComplaints.length > 0,
        highSentimentConcern: sentimentScore < 0.3,
        recommendedPriority: urgency,
        keywordTags: keywords.slice(0, 5)
      }
    };
  } catch (error) {
    console.error('Error generating complaint insights:', error);
    return {
      sentimentScore: 0.5,
      urgency: 'Medium',
      keywords: [],
      similarComplaints: [],
      insights: {
        isDuplicate: false,
        highSentimentConcern: false,
        recommendedPriority: 'Medium',
        keywordTags: []
      }
    };
  }
};

module.exports = {
  analyzeSentiment,
  findSimilarComplaints,
  findSimilarComplaintsAdvanced,
  calculateSimilarity,
  extractKeywords,
  classifyUrgency,
  generateComplaintInsights,
  preprocessText
};
