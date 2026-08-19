defmodule Ats.Repo.Migrations.AddJobSearchRanking do
  use Ecto.Migration

  @moduledoc """
  A full text index over the job's own words, for ordering by relevance.

  This does not replace the trigram indexes, and the two answer different
  questions. Trigrams serve `ILIKE '%front%'`, which is what someone typing
  half a word expects to match. Full text serves ranking: which of the matches
  mentions the term in the title rather than in passing, and how often.

  The `simple` configuration rather than `english` or `french`, because the
  seed data is both — "Ingénieur(e) Senior Frontend" and "Senior QA Engineer"
  in the same table. A stemmer for one language mangles the other, and
  guessing per row is a bigger decision than this exercise needs. `simple`
  lowercases and splits, which is the part that matters here.

  Indexed as an expression rather than a stored column: a generated column
  cannot reference the joined profession, so the query has to compute the
  vector anyway, and an expression index is what makes that cheap.
  """

  @vector "to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))"

  def up do
    execute("""
    CREATE INDEX jobs_search_vector_index ON jobs USING gin (#{@vector})
    """)
  end

  def down do
    execute("DROP INDEX jobs_search_vector_index")
  end
end
