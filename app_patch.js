// Hotfix v3.5.0.3 — guard legacy target vars
(function(){
  const _old = window.currentTargetKcal;
  if (typeof window.currentTargetKcal === 'undefined') {
    window.currentTargetKcal = 0;
  }
})();
