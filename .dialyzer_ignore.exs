[
  # Dialyzer ignore patterns
  # Format: {"Mod or File", :function, arity}
  #
  # Example of ignoring all warnings in a module:
  # {"lib/module.ex"}
  #
  # Example of ignoring a specific function:
  # {"lib/module.ex", :function_name, 2}

  # Ignore Mix.Tasks.Quality - it calls Mix task modules which are
  # only available at runtime, not during static analysis
  {"lib/mix/tasks/quality.ex"}
]
