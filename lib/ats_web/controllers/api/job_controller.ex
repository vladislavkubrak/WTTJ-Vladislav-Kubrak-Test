defmodule AtsWeb.Api.JobController do
  use AtsWeb, :controller

  alias Ats.Jobs
  alias Ats.Jobs.Job

  action_fallback AtsWeb.FallbackController

  # Only these reach the context. Anything else in the query string is dropped
  # here rather than deeper down, so the context never has to defend itself
  # against keys the HTTP layer invented.
  @search_params ~w(q office contract_type work_mode sort page page_size)

  @doc """
  Searches published jobs.

  Accepts `q`, `office`, `contract_type`, `work_mode`, `page` and `page_size`
  as query parameters. Unknown parameters are ignored, unknown filter values
  yield an empty page, and the response always carries pagination metadata.
  """
  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    page =
      params
      |> Map.take(@search_params)
      |> Jobs.search_jobs()

    render(conn, :index, page: page)
  end

  @doc """
  Returns the values the client can filter on.

  Offices come from the data, so the dropdown can never offer a location with
  no published jobs. Contract types and work modes come from the schema, so
  they cannot drift from what the database will actually accept.
  """
  @spec filters(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def filters(conn, _params) do
    render(conn, :filters,
      offices: Jobs.list_offices(),
      contract_types: Jobs.contract_type_options(),
      work_modes: Jobs.work_mode_options(),
      sorts: Jobs.sort_options()
    )
  end

  @doc """
  Create a new job.

  Expects job parameters in the request body. Returns the created job.
  """
  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"job" => job_params}) do
    with {:ok, %Job{} = job} <- Jobs.create_job(job_params) do
      conn
      |> put_status(:created)
      |> render(:show, job: job)
    end
  end

  @doc """
  Get a single job by ID.
  """
  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    job = Jobs.get_job!(id)
    render(conn, :show, job: job)
  end

  @doc """
  Update a job by ID.

  Expects job parameters in the request body. Returns the updated job.
  """
  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id, "job" => job_params}) do
    job = Jobs.get_job!(id)

    with {:ok, %Job{} = job} <- Jobs.update_job(job, job_params) do
      render(conn, :show, job: job)
    end
  end

  @doc """
  Delete a job by ID.
  """
  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    job = Jobs.get_job!(id)

    with {:ok, %Job{}} <- Jobs.delete_job(job) do
      send_resp(conn, :no_content, "")
    end
  end
end
