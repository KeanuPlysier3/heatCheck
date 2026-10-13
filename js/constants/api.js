// the online leaderboard: scores.php on Combell, next to the MySQL database.
// a full address, because the game itself runs on GitHub Pages (another domain).
// it comes from VITE_SCORES_URL: locally from .env, on GitHub from the repository variable of the same name
// (see .github/workflows/deploy.yml). Vite writes it into the built code, so it is public: only an address,
// never a password (the database login lives only in config.php on Combell)
export const Api = {
    scoresUrl: import.meta.env.VITE_SCORES_URL,
};
