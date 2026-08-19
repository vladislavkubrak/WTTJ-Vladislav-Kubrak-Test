defmodule AtsWeb.Api.JobJSON do
  @moduledoc "JSON rendering for Job resources."

  alias Ats.Jobs
  alias Ats.Jobs.Job

  @doc """
  Renders a list of jobs.

  Given a `:page`, the response also carries pagination metadata, which is what
  the search UI needs to render its pager. Given a plain `:jobs` list it keeps
  the original shape, so callers that predate pagination are unaffected.
  """
  @spec index(%{page: Ats.Jobs.page()}) :: %{data: [map()], meta: map()}
  @spec index(%{jobs: [%Job{}]}) :: %{data: [map()]}
  def index(%{page: page}) do
    %{
      data: for(job <- page.entries, do: data(job)),
      meta: %{
        total: page.total,
        # True when the count stopped at its ceiling, so the client can say
        # "1000+" instead of presenting a floor as a total.
        total_is_capped: page.total_is_capped,
        page: page.page,
        page_size: page.page_size,
        total_pages: page.total_pages
      }
    }
  end

  def index(%{jobs: jobs}) do
    %{data: for(job <- jobs, do: data(job))}
  end

  @doc """
  Renders the values available to filter on.
  """
  @spec filters(%{
          offices: [binary()],
          contract_types: [{atom(), binary()}],
          work_modes: [{atom(), binary()}],
          sorts: [{binary(), binary()}]
        }) :: %{data: map()}
  def filters(%{
        offices: offices,
        contract_types: contract_types,
        work_modes: work_modes,
        sorts: sorts
      }) do
    %{
      data: %{
        offices: offices,
        contract_types: for({value, label} <- contract_types, do: %{value: value, label: label}),
        work_modes: for({value, label} <- work_modes, do: %{value: value, label: label}),
        sorts: for({value, label} <- sorts, do: %{value: value, label: label})
      }
    }
  end

  @doc """
  Renders a single job.
  """
  @spec show(%{job: %Job{}}) :: %{data: map()}
  def show(%{job: job}) do
    %{data: data(job)}
  end

  @spec data(%Job{}) :: map()
  defp data(%Job{} = job) do
    %{
      id: job.id,
      title: job.title,
      description: job.description,
      contract_type: job.contract_type,
      # The raw enum stays, because it is what the client filters on. The label
      # is added next to it so every client does not reimplement the same
      # mapping — Ats.Jobs already owns it, and it was going unused.
      contract_type_label: Jobs.contract_type(job),
      office: job.office,
      status: job.status,
      work_mode: job.work_mode,
      work_mode_label: Jobs.work_mode(job),
      profession_id: job.profession_id,
      profession: Jobs.profession_name(job),
      inserted_at: job.inserted_at,
      updated_at: job.updated_at
    }
  end
end
