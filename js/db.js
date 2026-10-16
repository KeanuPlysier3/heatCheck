import { Api } from './constants/api.js';

// sends one round to the leaderboard. formData holds name, mode and score (see setData in script.js).
// sent as FormData without headers: a "simple" request, so the browser sends no extra OPTIONS request first,
// and PHP reads the fields as $_POST
export const uploadScore = async (formData) => {
    const response = await fetch(Api.scoresUrl, {
        method: 'POST',
        body: formData,
    });

    const result = await response.json(); // scores.php always answers JSON: { ok: true } or { ok: false, error }
    if (!response.ok || !result.ok) {
        throw new Error(result.error || 'upload failed');
    }
    return result;
};

// the top 10 of one mode ('downtownCountdown' or 'aroundTheWorld')
export const fetchScores = async (mode) => {
    const response = await fetch(`${Api.scoresUrl}?mode=${encodeURIComponent(mode)}`);
    if (!response.ok) {
        throw new Error('could not load the scores');
    }
    return response.json();
};
