# Deploy online Gym combat

The existing GitHub Pages game uses the same Supabase project and existing player
accounts. Keep your current `assets/` directory.

1. From the extracted folder, log in to the Supabase CLI and deploy the function.

   ```sh
   supabase login
   supabase functions deploy arena-combat --project-ref ckgcuhaiuwlccyaxewbv --no-verify-jwt
   ```

   The function validates each player's access token with Supabase Auth. It uses
   Supabase's built-in server credentials to read and update combat state.

2. In the Supabase SQL Editor, run `multiplayer.sql` in full. The migration
   cancels any in-progress match that was using the old combat rules.
3. Commit the updated `index.html`, `multiplayer.js`, and `cloud.js` to the
   folder GitHub Pages serves. Open the deployed game on two accounts.
4. Create a room, join it with the other account, and verify that both enter the
   arena before either presses Ready. Pick leads, ready up, and check a move,
   a recall, a knockout replacement, and the shared result.

To regenerate the deployed engine after editing the Gym combat rules in
`index.html`, run `python3 build-online-engine.py` before deploying the function.
