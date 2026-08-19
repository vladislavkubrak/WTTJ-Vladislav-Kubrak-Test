defmodule Ats.Jobs do
  @moduledoc """
  The Jobs context.
  """

  import Ecto.Query, warn: false
  alias Ats.Repo

  alias Ats.Jobs.Job
  alias Ats.Professions.Profession

  @default_page_size 20
  @max_page_size 100

  # Past this the exact total stops being information and starts being cost.
  # Nobody pages to result 1001, but every request pays for counting them, so
  # the count stops here and the client is told the answer is a floor.
  @count_limit 1_000

  # A list, not a map: the first entry is the default, and map key order is
  # not guaranteed — as a map this shipped a control reading "Office A–Z"
  # above a list ordered by recency.
  # First is the default, and it stays "recent": a job board is about
  # freshness, and a client that shows the first option as selected would
  # otherwise claim an unfiltered list was ranked by relevance to nothing.
  @sorts [
    {"recent", "Most recent"},
    {"relevance", "Most relevant"},
    {"title", "Title A–Z"},
    {"office", "Office A–Z"}
  ]

  @typedoc "Raw, untrusted query string parameters."
  @type search_params :: %{optional(binary()) => binary() | integer()}

  @typedoc "One page of search results, plus what the client needs to paginate."
  @type page :: %{
          entries: [%Job{}],
          total: non_neg_integer(),
          total_is_capped: boolean(),
          page: pos_integer(),
          page_size: pos_integer(),
          total_pages: non_neg_integer()
        }

  @work_modes %{
    onsite: "On site",
    remote: "Remote",
    hybrid: "Hybrid"
  }

  @contract_types %{
    FULL_TIME: "Full-Time",
    PART_TIME: "Part-Time",
    TEMPORARY: "Temporary",
    FREELANCE: "Freelance",
    INTERNSHIP: "Internship",
    APPRENTICESHIP: "Apprenticeship",
    VIE: "VIE"
  }

  @doc """
  Returns the human readable label of a job contract type.

  The map is exhaustive over `Ats.Jobs.Job`'s `:contract_type` enum, so every
  persistable value has a label. Note that `Ecto.Enum` loads the column as an
  atom, which is what this function keys on.

  ## Examples

      iex> contract_type(%Job{contract_type: :FULL_TIME})
      "Full-Time"

      iex> contract_type(%Job{contract_type: :VIE})
      "VIE"

  """
  @spec contract_type(%Job{}) :: binary() | nil
  def contract_type(job) do
    @contract_types[job.contract_type]
  end

  @doc """
  Returns every contract type as `{value, label}` pairs, ordered as declared.

  Exposed so the client can build its filter options from the source of truth
  instead of hardcoding a list that silently drifts from the schema.
  """
  @spec contract_type_options() :: [{atom(), binary()}]
  def contract_type_options do
    Ecto.Enum.values(Job, :contract_type)
    |> Enum.map(&{&1, @contract_types[&1]})
  end

  @doc """
  Returns the human readable label of a job work mode.

  Same contract as `contract_type/1`, and for the same reason: the mapping
  belongs here once rather than in every client that renders a job.
  """
  @spec work_mode(%Job{}) :: binary() | nil
  def work_mode(job), do: @work_modes[job.work_mode]

  @doc """
  Returns every work mode as `{value, label}` pairs, ordered as declared.
  """
  @spec work_mode_options() :: [{atom(), binary()}]
  def work_mode_options do
    Ecto.Enum.values(Job, :work_mode)
    |> Enum.map(&{&1, @work_modes[&1]})
  end

  @doc """
  Returns a job profession name.

  ## Examples

      iex> profession_name(%Job{profession: %Profession{name: "Software Engineer"}})
      "Software Engineer"
  """
  @spec profession_name(%Job{}) :: binary()
  def profession_name(%Job{profession: %Profession{name: profession_name}}) do
    profession_name
  end

  def profession_name(_job), do: ""

  @doc """
  Returns the list of jobs.

  ## Examples

      iex> list_jobs()
      [%Job{}, ...]

  """
  @spec list_jobs() :: [%Job{}]
  def list_jobs do
    Repo.all(Job) |> Repo.preload(:profession)
  end

  @doc """
  Searches the jobs that are visible to the public, one page at a time.

  Unlike `list_jobs/0`, which returns every row regardless of status, this
  function only ever returns `:published` jobs. The distinction is deliberate:
  `list_jobs/0` is an internal listing, `search_jobs/1` backs the public API.

  Recognised keys, all optional and all strings:

    * `"q"` — matches the job's `title`, its `description` or the name of its
      profession, case insensitive, anywhere in the field. `%` and `_` are
      escaped, so a user searching for `100%` gets literal results instead of
      a wildcard.
    * `"office"` — same partial, case insensitive match.
    * `"contract_type"`, `"work_mode"` — one or more enum values separated by
      commas. Values are cast against the schema; anything that does not cast
      is dropped, and a filter left with no valid value yields no results
      rather than an `Ecto.Query.CastError`.
    * `"sort"` — `relevance`, `recent`, `title` or `office`. Anything else
      falls back to the default rather than erroring: a bad sort is not worth
      refusing to answer over. `relevance` needs something to be relevant to,
      so without `q` it means `recent`.
    * `"page"`, `"page_size"` — clamped to sane bounds, never trusted.

  Returns a page map rather than a bare list because the client needs the
  total to render pagination, and computing it twice would double the work.

  ## Examples

      iex> search_jobs(%{"q" => "elixir", "work_mode" => "remote"})
      %{entries: [%Job{}], total: 1, page: 1, page_size: 20, total_pages: 1}

  """
  @spec search_jobs(search_params()) :: page()
  def search_jobs(params \\ %{}) do
    page = page_number(params)
    page_size = page_size(params)

    query = search_query(params)
    {total, capped} = count(query)

    entries =
      query
      |> sort_by(param(params, "sort"), param(params, "q"))
      |> limit(^page_size)
      |> offset(^((page - 1) * page_size))
      |> preload(:profession)
      |> Repo.all()

    %{
      entries: entries,
      total: total,
      total_is_capped: capped,
      page: page,
      page_size: page_size,
      total_pages: ceil_div(total, page_size)
    }
  end

  @doc """
  Returns the orderings the client may ask for, as `{value, label}` pairs.

  The first is the default, so a client can show it as selected without
  knowing which one that is.
  """
  @spec sort_options() :: [{binary(), binary()}]
  def sort_options, do: @sorts

  @doc """
  Returns the distinct offices that currently have at least one published job.

  Lets the client populate its office filter from real data, so the dropdown
  can never offer a location that returns nothing.
  """
  @spec list_offices() :: [binary()]
  def list_offices do
    Job
    |> published()
    |> distinct(true)
    |> order_by([job], asc: job.office)
    |> select([job], job.office)
    |> Repo.all()
  end

  @doc """
  Gets a single job.

  Raises `Ecto.NoResultsError` if the Job does not exist.

  ## Examples

      iex> get_job!(123)
      %Job{}

      iex> get_job!(456)
      ** (Ecto.NoResultsError)

  """
  @spec get_job!(integer() | binary()) :: %Job{}
  def get_job!(id),
    do: Repo.get!(Job, id) |> Repo.preload([:profession, applicants: [:candidate]])

  @doc """
  Creates a job.

  ## Examples

      iex> create_job(%{field: value})
      {:ok, %Job{}}

      iex> create_job(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  @spec create_job(map()) :: {:ok, %Job{}} | {:error, Ecto.Changeset.t()}
  def create_job(attrs \\ %{}) do
    %Job{}
    |> Job.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a job.

  ## Examples

      iex> update_job(job, %{field: new_value})
      {:ok, %Job{}}

      iex> update_job(job, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  @spec update_job(%Job{}, map()) :: {:ok, %Job{}} | {:error, Ecto.Changeset.t()}
  def update_job(%Job{} = job, attrs) do
    job
    |> Job.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a job.

  ## Examples

      iex> delete_job(job)
      {:ok, %Job{}}

      iex> delete_job(job)
      {:error, %Ecto.Changeset{}}

  """
  @spec delete_job(%Job{}) :: {:ok, %Job{}} | {:error, Ecto.Changeset.t()}
  def delete_job(%Job{} = job) do
    Repo.delete(job)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking job changes.

  ## Examples

      iex> change_job(job)
      %Ecto.Changeset{data: %Job{}}

  """
  @spec change_job(%Job{}, map()) :: Ecto.Changeset.t()
  def change_job(%Job{} = job, attrs \\ %{}) do
    Job.changeset(job, attrs)
  end

  # -- search internals -------------------------------------------------------
  #
  # Every filter is a query -> query function, so they compose in any order and
  # the whole chain is testable without touching the database.

  defp search_query(params) do
    Job
    |> published()
    |> filter_by_text(param(params, "q"))
    |> filter_by_office(param(params, "office"))
    |> filter_by_enum(:contract_type, param(params, "contract_type"))
    |> filter_by_enum(:work_mode, param(params, "work_mode"))
  end

  defp published(query), do: where(query, [job], job.status == :published)

  # Counting a filtered set costs a scan of everything that matched, and on a
  # table of any size that is the most expensive part of a search request.
  # Counting a bounded subquery instead means the cost has a ceiling, and the
  # client is told when the number it got is that ceiling rather than a total.
  defp count(query) do
    bounded = from(job in subquery(limit(exclude(query, :preload), @count_limit)), select: 1)
    total = Repo.aggregate(bounded, :count)

    {total, total >= @count_limit}
  end

  # Every ordering ends on `id` so that paging over rows that tie on the first
  # column cannot repeat or skip one. Without it, two jobs with the same title
  # can swap places between page one and page two.
  defp sort_by(query, "title", _text),
    do: order_by(query, [job], asc: job.title, asc: job.id)

  defp sort_by(query, "office", _text),
    do: order_by(query, [job], asc: job.office, asc: job.title, asc: job.id)

  # Relevance needs something to be relevant to. Asked for without a query it
  # would rank every row against an empty tsquery, which scores them all zero
  # and leaves the order to chance, so it means "recent" instead.
  defp sort_by(query, "relevance", text) when is_binary(text) do
    order_by(query, [job],
      desc:
        fragment(
          "ts_rank(to_tsvector('simple', coalesce(?, '') || ' ' || coalesce(?, '')), plainto_tsquery('simple', ?))",
          job.title,
          job.description,
          ^text
        ),
      desc: job.inserted_at,
      desc: job.id
    )
  end

  # "recent", relevance without a query, and anything unrecognised.
  defp sort_by(query, _sort, _text),
    do: order_by(query, [job], desc: job.inserted_at, desc: job.id)

  defp filter_by_text(query, nil), do: query

  defp filter_by_text(query, text) do
    pattern = "%#{escape_like(text)}%"

    # The profession is joined in rather than left to a separate filter because
    # it is how people describe the job they want: someone typing "frontend"
    # means the occupation, and expects to find a posting titled "React
    # Engineer". A left join keeps jobs with no profession in the results.
    from job in query,
      left_join: profession in assoc(job, :profession),
      where:
        ilike(job.title, ^pattern) or
          ilike(job.description, ^pattern) or
          ilike(profession.name, ^pattern)
  end

  defp filter_by_office(query, nil), do: query

  defp filter_by_office(query, office) do
    where(query, [job], ilike(job.office, ^"%#{escape_like(office)}%"))
  end

  defp filter_by_enum(query, _field, nil), do: query

  defp filter_by_enum(query, field, raw) do
    case cast_enum_values(field, raw) do
      [] -> where(query, [_job], false)
      values -> where(query, [job], field(job, ^field) in ^values)
    end
  end

  # `%` and `_` are LIKE wildcards. Left unescaped, searching for "100%" would
  # match everything starting with "100" — a subtle, silent wrong answer.
  defp escape_like(text), do: String.replace(text, ~r/[\\%_]/, &("\\" <> &1))

  defp cast_enum_values(field, raw) do
    raw
    |> String.split(",", trim: true)
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
    |> Enum.flat_map(fn value ->
      case cast_enum(field, value) do
        {:ok, casted} -> [casted]
        :error -> []
      end
    end)
    |> Enum.uniq()
  end

  # Contract types are uppercase atoms, work modes are lowercase. Rather than
  # encoding that per field, try the value as given and then both cases.
  defp cast_enum(field, value) do
    [value, String.upcase(value), String.downcase(value)]
    |> Enum.uniq()
    |> Enum.find_value(:error, fn candidate ->
      case Ecto.Enum.cast_value(Job, field, candidate) do
        {:ok, casted} -> {:ok, casted}
        :error -> nil
      end
    end)
  end

  defp param(params, key) do
    case Map.get(params, key) do
      value when is_binary(value) ->
        case String.trim(value) do
          "" -> nil
          trimmed -> trimmed
        end

      _ ->
        nil
    end
  end

  defp page_number(params), do: params |> integer_param("page", 1) |> max(1)

  defp page_size(params) do
    params
    |> integer_param("page_size", @default_page_size)
    |> max(1)
    |> min(@max_page_size)
  end

  defp integer_param(params, key, default) do
    case Map.get(params, key) do
      value when is_integer(value) ->
        value

      value when is_binary(value) ->
        case value |> String.trim() |> Integer.parse() do
          {integer, ""} -> integer
          _ -> default
        end

      _ ->
        default
    end
  end

  defp ceil_div(_total, 0), do: 0
  defp ceil_div(total, size), do: div(total + size - 1, size)
end
