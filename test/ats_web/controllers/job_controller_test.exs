defmodule AtsWeb.Api.JobControllerTest do
  use AtsWeb.ConnCase
  import Ats.JobsFixtures

  defp published_fixture(attrs \\ %{}) do
    attrs |> Map.new() |> Map.put(:status, "published") |> job_fixture()
  end

  defp ids(response), do: Enum.map(response["data"], & &1["id"])

  describe "index" do
    test "never exposes a job that is not published", %{conn: conn} do
      published = published_fixture(%{title: "Visible"})
      draft = job_fixture(%{title: "Hidden", status: "draft"})

      response = conn |> get(~p"/api/jobs") |> json_response(200)

      assert ids(response) == [published.id]
      refute draft.id in ids(response)
      assert response["meta"]["total"] == 1
    end

    test "returns pagination metadata alongside the data", %{conn: conn} do
      for index <- 1..3, do: published_fixture(%{title: "Job #{index}"})

      response = conn |> get(~p"/api/jobs?page=2&page_size=2") |> json_response(200)

      assert length(response["data"]) == 1

      assert response["meta"] == %{
               "total" => 3,
               "total_is_capped" => false,
               "page" => 2,
               "page_size" => 2,
               "total_pages" => 2
             }
    end

    test "filters on the query string", %{conn: conn} do
      elixir = published_fixture(%{title: "Elixir Engineer", description: "Backend"})
      _ruby = published_fixture(%{title: "Ruby Engineer", description: "Backend"})

      response = conn |> get(~p"/api/jobs?q=elixir") |> json_response(200)

      assert ids(response) == [elixir.id]
    end

    test "answers 200 with an empty page when a filter value is unknown", %{conn: conn} do
      published_fixture()

      # The naive implementation passes the raw string into the query, which
      # raises Ecto.Query.CastError and turns a typo into a 500.
      response = conn |> get(~p"/api/jobs?work_mode=banana") |> json_response(200)

      assert response["data"] == []
      assert response["meta"]["total"] == 0
    end

    test "ignores query parameters it does not recognise", %{conn: conn} do
      published_fixture()

      response = conn |> get(~p"/api/jobs?status=draft&order_by=salary") |> json_response(200)

      assert response["meta"]["total"] == 1
    end

    test "renders the contract type label next to the raw value", %{conn: conn} do
      published_fixture(%{contract_type: "FULL_TIME"})

      response = conn |> get(~p"/api/jobs") |> json_response(200)
      [job] = response["data"]

      # The raw value is what the client filters on, the label is what it
      # renders. Sending only one of the two pushes the mapping into every
      # client that consumes this endpoint.
      assert job["contract_type"] == "FULL_TIME"
      assert job["contract_type_label"] == "Full-Time"
      assert job["work_mode_label"] == "On site"
    end

    test "renders an empty profession rather than failing when there is none", %{conn: conn} do
      published_fixture()

      response = conn |> get(~p"/api/jobs") |> json_response(200)
      [job] = response["data"]

      assert job["profession"] == ""
    end

    test "survives hostile pagination input", %{conn: conn} do
      published_fixture()

      response = conn |> get(~p"/api/jobs?page=-1&page_size=999999") |> json_response(200)

      assert response["meta"]["page"] == 1
      assert response["meta"]["page_size"] == 100
    end
  end

  describe "filters" do
    test "returns the offices that actually have published jobs", %{conn: conn} do
      published_fixture(%{office: "Paris"})
      published_fixture(%{office: "Paris"})
      job_fixture(%{office: "Nantes", status: "draft"})

      response = conn |> get(~p"/api/jobs/filters") |> json_response(200)

      assert response["data"]["offices"] == ["Paris"]
    end

    test "returns every contract type and work mode the schema accepts", %{conn: conn} do
      response = conn |> get(~p"/api/jobs/filters") |> json_response(200)

      contract_values = Enum.map(response["data"]["contract_types"], & &1["value"])

      assert contract_values ==
               Ats.Jobs.Job |> Ecto.Enum.values(:contract_type) |> Enum.map(&to_string/1)

      # Both enums carry their label, so no client has to keep a second copy of
      # the mapping — which is exactly what three components were doing.
      assert response["data"]["work_modes"] == [
               %{"value" => "onsite", "label" => "On site"},
               %{"value" => "remote", "label" => "Remote"},
               %{"value" => "hybrid", "label" => "Hybrid"}
             ]
    end

    test "offers the orderings the client may ask for", %{conn: conn} do
      response = conn |> get(~p"/api/jobs/filters") |> json_response(200)

      values = Enum.map(response["data"]["sorts"], & &1["value"])

      # Order matters: the client shows the first as selected when the URL
      # carries no sort, so it has to be the one the server actually defaults
      # to. As a map this listed "office" first and the control lied.
      assert values == ["recent", "relevance", "title", "office"]
    end

    test "is not shadowed by the show route", %{conn: conn} do
      # "/api/jobs/filters" and "/api/jobs/:id" overlap; declared in the wrong
      # order, this request would try to load a job with id "filters".
      response = conn |> get(~p"/api/jobs/filters") |> json_response(200)

      assert Map.has_key?(response["data"], "offices")
    end
  end
end
