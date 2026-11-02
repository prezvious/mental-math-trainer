const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

test('database assigns preference revisions and timestamps without changing ownership policies', async t => {
  const database = new PGlite();
  t.after(() => database.close());
  const owner = '00000000-0000-0000-0000-000000000001';
  const other = '00000000-0000-0000-0000-000000000002';
  await database.exec(`
    create schema auth;
    create role authenticated;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
  `);
  await database.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations/20260330162000_create_user_preferences.sql'), 'utf8'));
  await database.query('insert into auth.users (id) values ($1), ($2)', [owner, other]);
  await database.query(`insert into public.user_preferences
    (user_id, theme_key, trainer_operation, trainer_left_digits, trainer_right_digits, trainer_round_size, updated_at)
    values ($1, 'paper-lantern', 'ADDITION', 2, 2, 10, '2099-01-01')`, [owner]);
  const migration = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261102055520_add_user_preferences_revision.sql'), 'utf8');
  await database.exec(migration);
  await database.exec(migration);

  const read = async id => (await database.query(`select revision::text, theme_key,
    updated_at between clock_timestamp() - interval '1 minute' and clock_timestamp() + interval '1 minute' as server_time
    from public.user_preferences where user_id = $1`, [id])).rows[0];
  assert.equal((await read(owner)).theme_key, 'paper-lantern');
  assert.equal((await read(owner)).revision, '0');

  await database.query(`insert into public.user_preferences
    (user_id, theme_key, trainer_operation, trainer_left_digits, trainer_right_digits, trainer_round_size, revision, updated_at)
    values ($1, 'carbon-paper', 'MULTIPLICATION', 2, 2, 10, 9999, '2099-01-01')`, [other]);
  assert.deepEqual(await read(other), { revision: '1', theme_key: 'carbon-paper', server_time: true });

  await database.query(`update public.user_preferences
    set theme_key = 'midnight-abacus', revision = 0, updated_at = '2000-01-01' where user_id = $1`, [other]);
  assert.deepEqual(await read(other), { revision: '2', theme_key: 'midnight-abacus', server_time: true });

  await database.query(`insert into public.user_preferences
    (user_id, theme_key, trainer_operation, trainer_left_digits, trainer_right_digits, trainer_round_size, revision, updated_at)
    values ($1, 'paper-lantern', 'MULTIPLICATION', 2, 2, 10, 9999, '2099-01-01')
    on conflict (user_id) do update set theme_key = excluded.theme_key,
      revision = excluded.revision, updated_at = excluded.updated_at`, [other]);
  assert.deepEqual(await read(other), { revision: '3', theme_key: 'paper-lantern', server_time: true });

  await database.exec(`grant usage on schema public, auth to authenticated;
    grant select, insert, update on public.user_preferences to authenticated;
    set role authenticated;`);
  await database.query("select set_config('request.jwt.claim.sub', $1, false)", [owner]);
  const inaccessible = await database.query('update public.user_preferences set theme_key = $1 where user_id = $2 returning user_id', ['carbon-paper', other]);
  assert.equal(inaccessible.rows.length, 0);
  await database.query('update public.user_preferences set trainer_round_size = 21 where user_id = $1', [owner]);
  assert.equal((await read(owner)).revision, '1');
  assert.equal((await read(owner)).server_time, true);
  await assert.rejects(database.query('select public.set_user_preferences_revision()'), /permission denied/i);
});
