export type AppVersionStage = 'Alpha' | 'Beta' | 'Stable' | 'RC';

const stageCandidate = __APP_STAGE__.trim();
const stage = (
  stageCandidate === 'Alpha' ||
  stageCandidate === 'Beta' ||
  stageCandidate === 'Stable' ||
  stageCandidate === 'RC'
) ? stageCandidate : 'Beta';

const buildTimestamp = __APP_BUILD_TIME__
  .split('-').join('')
  .split(':').join('')
  .split('.').join('')
  .replace('T', '')
  .replace('Z', '')
  .slice(0, 14);

const buildSuffixParts = [
  `build.${__APP_BUILD_COUNT__}`,
  __APP_BUILD_HASH__,
  buildTimestamp,
  __APP_BUILD_DIRTY__ ? 'dirty' : null,
].filter(Boolean);

export const APP_BUILD_INFO = {
  version: __APP_VERSION__,
  stage: stage as AppVersionStage,
  buildHash: __APP_BUILD_HASH__,
  buildCount: __APP_BUILD_COUNT__,
  buildTime: __APP_BUILD_TIME__,
  isDirty: __APP_BUILD_DIRTY__,
  displayVersion: `${__APP_VERSION__}+${buildSuffixParts.join('.')}`,
};
