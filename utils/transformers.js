/**
 * Utility functions for transforming data structures for API responses
 */

/**
 * Transforms a party document into a clean response object
 * @param {Object} party - The party document from MongoDB (populated with member users)
 * @returns {Object} Formatted party object for API response
 */
const transformPartyForResponse = (party) => {
  if (!party || !party.members) return null;

  return {
    id: party.id,
    createdBy: party.createdBy,
    createdAt: party.createdAt,
    members: party.members.map(member => {
      if (!member || !member.user) {
        console.warn(`Party ${party.id} has a member with a null or unpopulated user reference.`);
        return null;
      }
      return {
        id: member.user._id,
        username: member.user.username,
        score: member.user.score,
        joinedAt: member.joined
      };
    }).filter(member => member !== null)
  };
};

module.exports = {
  transformPartyForResponse
}; 