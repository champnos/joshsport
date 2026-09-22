alter table terms_and_conditions
add column if not exists content text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'terms_and_conditions'
      and column_name = 'intro'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'terms_and_conditions'
      and column_name = 'sections'
  ) then
    execute $sql$
      update terms_and_conditions
      set content = trim(both E'\n' from concat_ws(
        E'\n\n',
        nullif(btrim(intro), ''),
        (
          select string_agg(
            concat_ws(
              E'\n',
              nullif(btrim(section.value->>'title'), ''),
              (
                select string_agg(format('- %s', btrim(bullet.value)), E'\n')
                from jsonb_array_elements_text(coalesce(section.value->'bullets', '[]'::jsonb)) as bullet(value)
                where nullif(btrim(bullet.value), '') is not null
              )
            ),
            E'\n\n'
            order by section.ordinality
          )
          from jsonb_array_elements(coalesce(sections, '[]'::jsonb)) with ordinality as section(value, ordinality)
        )
      ))
      where coalesce(btrim(content), '') = '';
    $sql$;

    execute 'alter table terms_and_conditions drop column if exists intro';
    execute 'alter table terms_and_conditions drop column if exists sections';
  end if;
end
$$;

alter table terms_and_conditions
alter column content set not null;
