defmodule Ats.Repo.Migrations.AddJobSearchIndexes do
  use Ecto.Migration

  @moduledoc """
  Indexes backing the public job search.

  Two distinct access patterns, two kinds of index:

    * A leading-wildcard `ILIKE '%term%'` cannot use a btree index at all, so
      the text columns get GIN indexes over trigrams. This is what turns the
      search from a sequential scan into an index scan once the table grows
      past a few thousand rows.

    * The unfiltered listing is `WHERE status = 'published' ORDER BY
      inserted_at DESC, id DESC`. A composite index in exactly that shape lets
      Postgres satisfy both the filter and the sort without a sort node, which
      is what keeps deep pages from degrading.

  `CREATE INDEX CONCURRENTLY` is deliberately not used here. It cannot run
  inside a transaction, and on a table this size the exclusive lock is
  measured in milliseconds. In production, against a live jobs table, these
  would be split into their own `@disable_ddl_transaction true` migration.
  """

  def up do
    # Ships with Postgres, but is not enabled by default on a fresh database.
    execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    create(index(:jobs, ["title gin_trgm_ops"], using: "gin", name: :jobs_title_trgm_index))

    create(
      index(:jobs, ["description gin_trgm_ops"],
        using: "gin",
        name: :jobs_description_trgm_index
      )
    )

    create(index(:jobs, ["office gin_trgm_ops"], using: "gin", name: :jobs_office_trgm_index))

    create(
      index(:jobs, [:status, "inserted_at DESC", "id DESC"], name: :jobs_status_recency_index)
    )
  end

  def down do
    drop(index(:jobs, [], name: :jobs_status_recency_index))
    drop(index(:jobs, [], name: :jobs_office_trgm_index))
    drop(index(:jobs, [], name: :jobs_description_trgm_index))
    drop(index(:jobs, [], name: :jobs_title_trgm_index))

    # The extension is intentionally left in place: other tables may rely on it,
    # and dropping it would cascade into their indexes.
  end
end
