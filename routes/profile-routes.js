const express = require('express');
const { check, oneOf } = require('express-validator');
const advancedResults = require('../middleware/advancedResults');
const { protect, authorise } = require('../middleware/auth');
const { checkInputError } = require('../middleware/input-validation');
const {
  INVALID_TIMESTAMP_MSG,
  INVALID_FIELD_MSG
} = require('../utils/inputExceptionMsg');
const { DATETIME_REGEX } = require('../utils/regex');
const router = express.Router();

// Include other resource's controllers to access their endpoints
const skillRoute = require('./skill-routes');
const participantRoute = require('./participant-routes');

// Re-route this URI to other resource router
router.use('/:user_id/skills', skillRoute);
router.use('/:user_id/participants', participantRoute);

// import controllers here
const {
  getProfiles,
  getProfile,
  updateProfile,
  verifyProfile
} = require('../controllers/profiles');
const { NO_FIELD_UPDATED_MSG } = require('../utils/inputExceptionMsg');

// map routes to controller
router.route('/').get(advancedResults('profiles'), getProfiles);

router.route('/:id').get(getProfile);

router.use(protect);

router
  .route('/:id')
  .put(
    authorise('admin', 'user'),
    [
      oneOf(
        [
          check('profile_picture').exists(),
          check('about').exists(),
          check('gender').exists(),
          check('dob').exists(),
          check('interest').exists(),
          check('phone').exists(),
          check('facebook_link').exists(),
          check('twitter_link').exists(),
          check('instagram_link').exists(),
          check('linkedin_link').exists()
        ],
        NO_FIELD_UPDATED_MSG
      ),
      check('dob')
        .optional()
        .matches(DATETIME_REGEX)
        .withMessage(INVALID_TIMESTAMP_MSG('dob')),
      check('phone')
        .optional()
        .isMobilePhone('any')
        .withMessage(INVALID_FIELD_MSG('phone number')),
      check([
        'facebook_link',
        'twitter_link',
        'instagram_link',
        'linkedin_link'
      ])
        .optional()
        .isURL()
        .withMessage(INVALID_FIELD_MSG('URL'))
    ],
    checkInputError,
    updateProfile
  );

router
  .route('/:id')
  .put(
    authorise('admin'),
    [check('is_verified', NO_FIELD_UPDATED_MSG).exists()],
    checkInputError,
    verifyProfile
  );

module.exports = router;