defmodule Ats.JobsTest do
  use Ats.DataCase

  alias Ats.Jobs

  describe "jobs" do
    alias Ats.Jobs.Job

    import Ats.JobsFixtures

    @invalid_attrs %{
      contract_type: nil,
      description: nil,
      office: nil,
      status: nil,
      title: nil
    }

    test "list_jobs/0 returns all jobs" do
      job = job_fixture()
      assert Jobs.list_jobs() |> Enum.map(& &1.id) == [job.id]
    end

    test "get_job!/1 returns the job with given id" do
      job = job_fixture()
      assert Jobs.get_job!(job.id).id == job.id
    end

    test "create_job/1 with valid data creates a job" do
      valid_attrs = %{
        contract_type: "FULL_TIME",
        description: "Elixir dev backend",
        office: "Paris",
        status: "draft",
        title: "Dev Backend",
        work_mode: "onsite"
      }

      assert {:ok, %Job{} = job} = Jobs.create_job(valid_attrs)
      assert job.contract_type == :FULL_TIME
      assert job.description == "Elixir dev backend"
      assert job.office == "Paris"
      assert job.status == :draft
      assert job.title == "Dev Backend"
      assert job.work_mode == :onsite
    end

    test "create_job/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Jobs.create_job(@invalid_attrs)
    end

    test "update_job/2 with valid data updates the job" do
      job = job_fixture()

      update_attrs = %{
        contract_type: "PART_TIME",
        description: "Elixir dev backend senior",
        office: "Barcelone",
        status: "published",
        title: "Dev Backend",
        work_mode: "hybrid"
      }

      assert {:ok, %Job{} = job} = Jobs.update_job(job, update_attrs)
      assert job.contract_type == :PART_TIME
      assert job.description == "Elixir dev backend senior"
      assert job.office == "Barcelone"
      assert job.status == :published
      assert job.title == "Dev Backend"
      assert job.work_mode == :hybrid
    end

    test "update_job/2 with invalid data returns error changeset" do
      job = job_fixture()
      assert {:error, %Ecto.Changeset{}} = Jobs.update_job(job, @invalid_attrs)
      assert job.id == Jobs.get_job!(job.id).id
    end

    test "delete_job/1 deletes the job" do
      job = job_fixture()
      assert {:ok, %Job{}} = Jobs.delete_job(job)
      assert_raise Ecto.NoResultsError, fn -> Jobs.get_job!(job.id) end
    end

    test "change_job/1 returns a job changeset" do
      job = job_fixture()
      assert %Ecto.Changeset{} = Jobs.change_job(job)
    end
  end

  describe "search_jobs/1" do
    import Ats.JobsFixtures

    # The fixture defaults to :draft, which is exactly the status the public
    # search must never return — so every visible job is published on purpose.
    defp published_fixture(attrs \\ %{}) do
      attrs |> Map.new() |> Map.put(:status, "published") |> job_fixture()
    end

    defp ids(page), do: Enum.map(page.entries, & &1.id)

    test "only returns published jobs" do
      published = published_fixture(%{title: "Visible"})
      _draft = job_fixture(%{title: "Hidden", status: "draft"})
      _archived = job_fixture(%{title: "Gone", status: "archived"})

      page = Jobs.search_jobs()

      assert ids(page) == [published.id]
      assert page.total == 1
    end

    test "matches a partial, case insensitive fragment of the title" do
      job = published_fixture(%{title: "Senior Elixir Engineer", description: "Backend work"})
      _other = published_fixture(%{title: "Product Designer", description: "Design work"})

      assert ids(Jobs.search_jobs(%{"q" => "elixir"})) == [job.id]
      assert ids(Jobs.search_jobs(%{"q" => "ELIXIR"})) == [job.id]
      assert ids(Jobs.search_jobs(%{"q" => "or Elix"})) == [job.id]
    end

    test "matches the name of the profession, not only the job's own words" do
      profession = Ats.ProfessionsFixtures.profession_fixture(%{name: "Frontend"})

      job =
        published_fixture(%{
          title: "React Engineer",
          description: "Building things",
          profession_id: profession.id
        })

      _other = published_fixture(%{title: "Plumber", description: "Pipes"})

      # Someone searching "frontend" is naming the occupation, and expects to
      # find a posting whose title never says the word.
      assert ids(Jobs.search_jobs(%{"q" => "frontend"})) == [job.id]
    end

    test "accepts a profession when the job is created" do
      profession = Ats.ProfessionsFixtures.profession_fixture(%{name: "Data"})

      {:ok, job} =
        Jobs.create_job(%{
          title: "Analyst",
          office: "Paris",
          contract_type: "FULL_TIME",
          profession_id: profession.id
        })

      assert job.profession_id == profession.id
    end

    test "still returns jobs that have no profession" do
      job = published_fixture(%{title: "Unclassified role", description: "Work"})

      # A left join, not an inner one: an unclassified job is still a job.
      assert ids(Jobs.search_jobs(%{"q" => "unclassified"})) == [job.id]
    end

    test "matches the description as well as the title" do
      job = published_fixture(%{title: "Backend", description: "You will write Elixir daily"})

      assert ids(Jobs.search_jobs(%{"q" => "daily"})) == [job.id]
    end

    test "treats LIKE wildcards in the query as literal characters" do
      match =
        published_fixture(%{title: "Grow revenue by 100% yearly", description: "Sales role"})

      _other =
        published_fixture(%{title: "Grow revenue by 100 percent", description: "Sales role"})

      # Unescaped, "100%" would match both — a silently wrong answer rather
      # than an error, which is why it deserves its own test.
      assert ids(Jobs.search_jobs(%{"q" => "100%"})) == [match.id]

      # A lone "%" is a literal too: it finds the one title that contains the
      # character, not every row in the table.
      assert ids(Jobs.search_jobs(%{"q" => "%"})) == [match.id]

      # Same for the single character wildcard.
      assert Jobs.search_jobs(%{"q" => "_"}).total == 0
    end

    test "ignores a blank or whitespace-only query" do
      published_fixture()
      published_fixture()

      assert Jobs.search_jobs(%{"q" => ""}).total == 2
      assert Jobs.search_jobs(%{"q" => "   "}).total == 2
    end

    test "filters by office, partially and case insensitively" do
      paris = published_fixture(%{office: "Paris"})
      _nantes = published_fixture(%{office: "Nantes"})

      assert ids(Jobs.search_jobs(%{"office" => "par"})) == [paris.id]
    end

    test "filters by an enum, accepting any casing" do
      remote = published_fixture(%{work_mode: "remote"})
      _onsite = published_fixture(%{work_mode: "onsite"})

      assert ids(Jobs.search_jobs(%{"work_mode" => "remote"})) == [remote.id]
      assert ids(Jobs.search_jobs(%{"work_mode" => "REMOTE"})) == [remote.id]
    end

    test "accepts several comma separated values for one enum filter" do
      full_time = published_fixture(%{contract_type: "FULL_TIME"})
      internship = published_fixture(%{contract_type: "INTERNSHIP"})
      _freelance = published_fixture(%{contract_type: "FREELANCE"})

      page = Jobs.search_jobs(%{"contract_type" => "FULL_TIME, INTERNSHIP"})

      assert Enum.sort(ids(page)) == Enum.sort([full_time.id, internship.id])
    end

    test "returns an empty page for an unknown enum value instead of raising" do
      published_fixture()

      # Passing the value straight into the query would raise
      # Ecto.Query.CastError and surface as a 500.
      assert Jobs.search_jobs(%{"work_mode" => "banana"}).total == 0
      assert Jobs.search_jobs(%{"contract_type" => "banana"}).total == 0
    end

    test "keeps the valid values when only some of them cast" do
      remote = published_fixture(%{work_mode: "remote"})
      _onsite = published_fixture(%{work_mode: "onsite"})

      assert ids(Jobs.search_jobs(%{"work_mode" => "remote,banana"})) == [remote.id]
    end

    test "combines every filter with AND" do
      wanted =
        published_fixture(%{
          title: "Elixir Engineer",
          office: "Paris",
          work_mode: "remote",
          contract_type: "FULL_TIME"
        })

      _wrong_office = published_fixture(%{title: "Elixir Engineer", office: "Nantes"})
      _wrong_mode = published_fixture(%{title: "Elixir Engineer", work_mode: "onsite"})
      _wrong_title = published_fixture(%{title: "Ruby Engineer", office: "Paris"})

      page =
        Jobs.search_jobs(%{
          "q" => "elixir",
          "office" => "Paris",
          "work_mode" => "remote",
          "contract_type" => "FULL_TIME"
        })

      assert ids(page) == [wanted.id]
    end

    test "paginates and reports the total across all pages" do
      for index <- 1..5, do: published_fixture(%{title: "Job #{index}"})

      first = Jobs.search_jobs(%{"page" => "1", "page_size" => "2"})
      second = Jobs.search_jobs(%{"page" => "2", "page_size" => "2"})
      last = Jobs.search_jobs(%{"page" => "3", "page_size" => "2"})

      assert length(first.entries) == 2
      assert length(last.entries) == 1
      assert first.total == 5
      assert first.total_pages == 3

      # Pages must not overlap, which only holds because the ordering has a
      # deterministic tiebreak on id.
      assert ids(first) != ids(second)
      assert Enum.uniq(ids(first) ++ ids(second) ++ ids(last)) |> length() == 5
    end

    test "returns an empty page past the last one" do
      published_fixture()

      page = Jobs.search_jobs(%{"page" => "99"})

      assert page.entries == []
      assert page.total == 1
    end

    test "clamps hostile pagination parameters" do
      published_fixture()

      assert Jobs.search_jobs(%{"page" => "-5"}).page == 1
      assert Jobs.search_jobs(%{"page" => "0"}).page == 1
      assert Jobs.search_jobs(%{"page" => "abc"}).page == 1
      assert Jobs.search_jobs(%{"page_size" => "0"}).page_size == 1
      assert Jobs.search_jobs(%{"page_size" => "100000"}).page_size == 100
      assert Jobs.search_jobs(%{"page_size" => "abc"}).page_size == 20
    end

    test "ranks the closest match first when asked for relevance" do
      passing =
        published_fixture(%{
          title: "Product Designer",
          description: "You will work alongside an elixir team"
        })

      squarely =
        published_fixture(%{
          title: "Elixir Engineer",
          description: "Elixir, elixir and more elixir"
        })

      page = Jobs.search_jobs(%{"q" => "elixir", "sort" => "relevance"})

      # Both match; the one that is about Elixir outranks the one that
      # mentions it.
      assert ids(page) == [squarely.id, passing.id]
    end

    test "falls back to recency when relevance has nothing to rank against" do
      older = published_fixture(%{title: "Older"})
      newer = published_fixture(%{title: "Newer"})

      # Ranking every row against an empty query scores them all zero and
      # leaves the order to chance.
      assert ids(Jobs.search_jobs(%{"sort" => "relevance"})) == [newer.id, older.id]
    end

    test "stops counting at a ceiling and says that it did" do
      published_fixture()

      page = Jobs.search_jobs()

      # Counting a filtered set costs a scan of everything that matched. Below
      # the ceiling the total is exact and says so.
      assert page.total == 1
      refute page.total_is_capped
    end

    test "sorts by title when asked, with a stable tiebreak" do
      b = published_fixture(%{title: "Backend Engineer"})
      a = published_fixture(%{title: "Analyst"})
      c = published_fixture(%{title: "Consultant"})

      assert ids(Jobs.search_jobs(%{"sort" => "title"})) == [a.id, b.id, c.id]
    end

    test "falls back to the default ordering for a sort it does not know" do
      older = published_fixture(%{title: "Older"})
      newer = published_fixture(%{title: "Newer"})

      # Answering with the default beats refusing to answer over a typo.
      assert ids(Jobs.search_jobs(%{"sort" => "banana"})) == [newer.id, older.id]
    end

    test "orders the newest job first" do
      older = published_fixture(%{title: "Older"})
      newer = published_fixture(%{title: "Newer"})

      assert ids(Jobs.search_jobs()) == [newer.id, older.id]
    end

    test "preloads the profession so rendering a page cannot trigger N+1" do
      published_fixture()

      [job] = Jobs.search_jobs().entries

      refute match?(%Ecto.Association.NotLoaded{}, job.profession)
    end
  end

  describe "list_offices/0" do
    import Ats.JobsFixtures

    test "returns each published office once, sorted" do
      job_fixture(%{office: "Paris", status: "published"})
      job_fixture(%{office: "Paris", status: "published"})
      job_fixture(%{office: "Bordeaux", status: "published"})
      job_fixture(%{office: "Nantes", status: "draft"})

      assert Jobs.list_offices() == ["Bordeaux", "Paris"]
    end
  end

  describe "contract_type_options/0" do
    test "covers every value the schema accepts" do
      options = Jobs.contract_type_options()

      assert Enum.map(options, &elem(&1, 0)) == Ecto.Enum.values(Ats.Jobs.Job, :contract_type)
      refute Enum.any?(options, fn {_value, label} -> is_nil(label) end)
    end
  end
end
