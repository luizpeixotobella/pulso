-- Run after the migration, inside a transaction, ending with rollback.
do $$
declare fixture uuid; total integer;
begin
 if has_table_privilege('anon','public.pulso_support_tickets','select') or has_table_privilege('authenticated','public.pulso_support_tickets','select') then raise exception 'ticket disclosure'; end if;
 if has_table_privilege('anon','public.pulso_support_messages','insert') or has_table_privilege('authenticated','public.pulso_support_messages','select') then raise exception 'thread bypass'; end if;
 if has_function_privilege('anon','public.pulso_support_append(uuid,text,text,text)','execute') or has_function_privilege('authenticated','public.pulso_support_append(uuid,text,text,text)','execute') then raise exception 'reply bypass'; end if;
 if exists (select 1 from pg_class where oid in ('public.pulso_support_tickets'::regclass,'public.pulso_support_messages'::regclass) and not relrowsecurity) then raise exception 'RLS disabled'; end if;
 insert into public.pulso_support_tickets(email,topic,message,access_hash) values('rollback@example.invalid','problema','Teste em transação com rollback.',repeat('a',64)) returning id into fixture;
 perform public.pulso_support_append(fixture,'operator','Resposta humana de teste.','answered');
 if (select status from public.pulso_support_tickets where id=fixture) <> 'answered' then raise exception 'status not answered'; end if;
 perform public.pulso_support_append(fixture,'visitor','Complemento ao mesmo protocolo.','open');
 if (select status from public.pulso_support_tickets where id=fixture) <> 'open' then raise exception 'followup not reopened'; end if;
 select count(*) into total from public.pulso_support_messages where ticket_id=fixture;
 if total <> 2 then raise exception 'history incomplete'; end if;
 begin
  perform public.pulso_support_append(fixture,'visitor','Tentativa inválida.','resolved');
  raise exception 'visitor status was allowed';
 exception when others then
  if sqlerrm='visitor status was allowed' then raise; end if;
 end;
end;
$$;
select 'PASS: private grants/RLS, service-only reply function, persisted history, visitor reopens same protocol; fixtures rolled back' as checks;
