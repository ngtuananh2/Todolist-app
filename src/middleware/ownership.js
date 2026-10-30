const { AsyncLocalStorage } = require('node:async_hooks');

const ownershipContext = new AsyncLocalStorage();

function runWithOwner(ownerId, callback) {
  return ownershipContext.run({ ownerId: String(ownerId) }, callback);
}

function getOwnerId() {
  return ownershipContext.getStore()?.ownerId || null;
}

function ownershipPlugin(schema) {
  schema.add({ ownerId: { type: schema.base.Types.ObjectId, ref: 'User', index: true, default: null } });

  schema.pre('save', function (next) {
    const ownerId = getOwnerId();
    if (ownerId && !this.ownerId) this.ownerId = ownerId;
    next();
  });

  schema.pre(/^find/, function (next) {
    const ownerId = getOwnerId();
    if (ownerId) this.where({ ownerId });
    next();
  });

  schema.pre(/^(update|delete|replace)/, function (next) {
    const ownerId = getOwnerId();
    if (ownerId) this.where({ ownerId });
    next();
  });
}

module.exports = { getOwnerId, ownershipContext, ownershipPlugin, runWithOwner };
