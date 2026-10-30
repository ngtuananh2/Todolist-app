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

  schema.pre('save', function () {
    const ownerId = getOwnerId();
    if (ownerId && !this.ownerId) this.ownerId = ownerId;
  });

  schema.pre(/^find/, function () {
    const ownerId = getOwnerId();
    if (ownerId) this.where({ ownerId });
  });

  schema.pre(/^(update|delete|replace)/, function () {
    const ownerId = getOwnerId();
    if (ownerId) this.where({ ownerId });
  });
}

module.exports = { getOwnerId, ownershipContext, ownershipPlugin, runWithOwner };
