const { db } = require('../db/db');
const { asyncHandler } = require('../middleware');
const { ErrorResponse } = require('../utils');

/**
 * @desc    Get all listing skills
 * @route   GET /api/listing-skills
 * @desc    Get all listing skills for a listing
 * @route   GET /api/listings/:listing_id/listing-skills
 * @access  Public
 */
exports.getListingSkills = asyncHandler(async (req, res, next) => {
  if (req.params.listing_id) {
    // return 404 error response if listing not found or soft deleted
    const listingSkills = await db.many(
      'SELECT ls.listing_skill_id, l.listing_id, ls.skill_id, s.skill FROM listingsview l LEFT JOIN ListingSkills ls ON l.listing_id = ls.listing_id LEFT JOIN Skills s ON ls.skill_id = s.skill_id WHERE l.listing_id = $1',
      req.params.listing_id
    );

    // remove null skill_id from result
    const data = listingSkills.filter(ls => ls.listing_skill_id !== null);

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  }

  res.status(200).json(res.advancedResults);
});

/**
 * @desc    Get single listingskill by listing skill id
 * @route   GET /api/listing-skills/:id
 * @access  Public
 */
exports.getListingSkill = asyncHandler(async (req, res) => {
  const rows = await db.one(
    'SELECT * FROM ListingSkills ls JOIN Skills s ON ls.skill_id = s.skill_id WHERE listing_skill_id = $1',
    req.params.id
  );
  res.status(200).json({
    success: true,
    data: rows,
  });
});

/**
 * @desc    Create a customized listing skill specific to current listing id and update in skills table
 * @route   POST /api/listing-skills/add-skill
 * @access  Admin/Owner
 */
exports.createCustomListingSkill = asyncHandler(async (req, res, next) => {
  const { listing_id, skill } = req.body;

  const data = {
    listing_id,
    skill,
  };

  // check listing owner for non-admin users
  if (
    req.user.role !== 'admin' &&
    !(await isListingOwner(req.user.user_id, listing_id))
  ) {
    return next(
      new ErrorResponse(
        `Not authorised to create listing skills for this listing`,
        403
      )
    );
  }

  //if skill already exists, just link both listing and skill together in table
  if (!(await doesSkillExist(skill))) {
    const preinsert = await db.one(
      'INSERT INTO skills (skill) VALUES ($1) RETURNING *',
      skill
    )
  }

  const skill_id_row = await db.one(
    'SELECT skill_id FROM skills WHERE skill = $1',
    skill
  );

  const rows = await db.one(
    'INSERT INTO listingskills (listing_id, skill_id) VALUES ($1, $2) RETURNING *',
    [listing_id, skill_id_row.skill_id]
  );

  res.status(201).json({
    success: true,
    data: rows,
  });

})

/**
 * @desc    Create listing skill for listing (with skill_id known)
 * @route   POST /api/listing-skills
 * @access  Admin/Owner
 */
exports.createListingSkill = asyncHandler(async (req, res, next) => {
  const { listing_id, skill_id } = req.body;

  const data = {
    listing_id,
    skill_id,
  };

  // check listing owner for non-admin users
  if (
    req.user.role !== 'admin' &&
    !(await isListingOwner(req.user.user_id, listing_id))
  ) {
    return next(
      new ErrorResponse(
        `Not authorised to create listing skills for this listing`,
        403
      )
    );
  }

  const rows = await db.one(
    'INSERT INTO ListingSkills (${this:name}) VALUES (${this:csv}) RETURNING *',
    data
  );

  res.status(201).json({
    success: true,
    data: rows,
  });
});

/**
 * @desc    Delete single listing skill by listing skill id
 * @route   DELETE /api/listing-skills/:id
 * @access  Admin/Owner
 */
exports.deleteListingSkill = asyncHandler(async (req, res, next) => {
  // check if listingskill exists
  const listingSkill = await db.one(
    'SELECT * FROM ListingSkills WHERE listing_skill_id = $1',
    req.params.id
  );

  // check listing owner for non-admin users
  if (
    req.user.role !== 'admin' &&
    !(await isListingOwner(req.user.user_id, listingSkill.listing_id))
  ) {
    return next(
      new ErrorResponse(
        `Not authorised to create listing skills for this listing`,
        403
      )
    );
  }

  const rows = await db.one(
    'DELETE FROM ListingSkills WHERE listing_skill_id = $1 RETURNING *',
    req.params.id
  );

  res.status(200).json({
    success: true,
    data: rows,
  });
});

const isListingOwner = async (userId, listingId) => {
  const owner = await db.one(
    'SELECT created_by FROM Listings WHERE listing_id = $1',
    listingId
  );
  return userId === owner.created_by;
};

const doesSkillExist = async (skill) => {
  const skillBool = await db.oneOrNone(
    'SELECT * FROM skills WHERE skill = $1',
    skill
  );
  return skillBool;
}

