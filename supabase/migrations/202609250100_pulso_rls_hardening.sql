-- The block-relationship helper is only needed by authenticated RLS policies.
-- It must not be callable by anonymous clients as an arbitrary relationship oracle.
revoke execute on function public.pulso_has_block_between(uuid, uuid) from anon;
grant execute on function public.pulso_has_block_between(uuid, uuid) to authenticated;
