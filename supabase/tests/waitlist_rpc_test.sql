-- ============================================================================
-- Waitlist RPC integration test
--
-- Runs against the real schema (Supabase SQL editor or `psql`). Creates its
-- own throwaway users/game, simulates each user's JWT via
-- request.jwt.claims, exercises join_game / leave_game, and ALWAYS rolls
-- back by raising at the end.
--
-- PASS:  ERROR: TEST_SUITE_PASSED — all 6 waitlist RPC tests OK
-- FAIL:  ERROR: FAIL T<n>: <description>
-- ============================================================================

DO $$
DECLARE
  u1 uuid := gen_random_uuid();
  u2 uuid := gen_random_uuid();
  u3 uuid := gen_random_uuid();
  v_game uuid;
  v_reg record;
  v_promoted uuid;
  v_count int;
BEGIN
  -- ── Setup: three users (trigger creates their profiles) ──
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    (u1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u1 || '@test.local', '{}', '{}', now(), now()),
    (u2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u2 || '@test.local', '{}', '{}', now(), now()),
    (u3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u3 || '@test.local', '{}', '{}', now(), now());

  SELECT count(*) INTO v_count FROM profiles WHERE id IN (u1, u2, u3);
  IF v_count <> 3 THEN RAISE EXCEPTION 'FAIL: handle_new_user trigger did not create profiles (got %)', v_count; END IF;

  INSERT INTO games (title, scheduled_at, max_players, status, created_by)
  VALUES ('RPC Test Game', now() + interval '7 days', 2, 'open', u1)
  RETURNING id INTO v_game;

  -- ── Test 1: first two joins are confirmed, third hits the waitlist ──
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  PERFORM join_game(v_game);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  PERFORM join_game(v_game);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u3, 'role', 'authenticated')::text, true);
  PERFORM join_game(v_game);

  SELECT status, position INTO v_reg FROM registrations WHERE game_id = v_game AND profile_id = u1;
  IF v_reg.status <> 'confirmed' OR v_reg.position <> 1 THEN RAISE EXCEPTION 'FAIL T1: u1 should be confirmed #1, got % #%', v_reg.status, v_reg.position; END IF;
  SELECT status, position INTO v_reg FROM registrations WHERE game_id = v_game AND profile_id = u3;
  IF v_reg.status <> 'waitlist' OR v_reg.position <> 3 THEN RAISE EXCEPTION 'FAIL T1: u3 should be waitlist #3, got % #%', v_reg.status, v_reg.position; END IF;

  -- ── Test 2: double-join is rejected ──
  BEGIN
    PERFORM join_game(v_game);
    RAISE EXCEPTION 'FAIL T2: double join should have raised';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%Already registered%' THEN RAISE; END IF;
  END;

  -- ── Test 3: a stranger cannot remove someone else's registration ──
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u3, 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM leave_game((SELECT id FROM registrations WHERE game_id = v_game AND profile_id = u2));
    RAISE EXCEPTION 'FAIL T3: u3 removing u2 should have raised';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%Not authorised%' THEN RAISE; END IF;
  END;

  -- ── Test 4: confirmed player leaves → first waitlisted player is promoted, and is returned ──
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  SELECT leave_game(id) INTO v_promoted FROM registrations WHERE game_id = v_game AND profile_id = u1;
  IF v_promoted <> u3 THEN RAISE EXCEPTION 'FAIL T4: leave_game should return promoted u3, got %', v_promoted; END IF;
  SELECT status INTO v_reg FROM registrations WHERE game_id = v_game AND profile_id = u3;
  IF v_reg.status <> 'confirmed' THEN RAISE EXCEPTION 'FAIL T4: u3 should be promoted to confirmed, got %', v_reg.status; END IF;
  SELECT count(*) INTO v_count FROM registrations WHERE game_id = v_game AND status = 'confirmed';
  IF v_count <> 2 THEN RAISE EXCEPTION 'FAIL T4: expected 2 confirmed after promotion, got %', v_count; END IF;

  -- ── Test 5: waitlisted player leaving promotes nobody ──
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  PERFORM join_game(v_game);  -- game full (u2+u3) → u1 lands on waitlist
  SELECT status INTO v_reg FROM registrations WHERE game_id = v_game AND profile_id = u1;
  IF v_reg.status <> 'waitlist' THEN RAISE EXCEPTION 'FAIL T5: u1 rejoin should be waitlist, got %', v_reg.status; END IF;
  SELECT leave_game(id) INTO v_promoted FROM registrations WHERE game_id = v_game AND profile_id = u1;
  IF v_promoted IS NOT NULL THEN RAISE EXCEPTION 'FAIL T5: waitlister leaving must promote nobody, got %', v_promoted; END IF;

  -- ── Test 6: joining a non-open game is rejected ──
  UPDATE games SET status = 'cancelled' WHERE id = v_game;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM join_game(v_game);
    RAISE EXCEPTION 'FAIL T6: joining a cancelled game should have raised';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%not open%' THEN RAISE; END IF;
  END;

  -- All assertions passed — abort to roll every test row back.
  RAISE EXCEPTION 'TEST_SUITE_PASSED — all 6 waitlist RPC tests OK (rolled back)';
END $$;
