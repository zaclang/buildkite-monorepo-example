
## buildkite-monorepo-example

* Single commit to deploy any number of services

* Service pipeline steps are dynamically consumed on change

* Single click to release all changed services

* e2e suite runs after all deployments complete


### flow:

```
foo-service \                                                  / foo-service-staging \                  / foo-service-prod \
             -> commit -> detect changes -> trigger services ->                        -> e2e-staging ->                    -> e2e-prod
bar-service /                                                  \ bar-service-staging /                  \ bar-service-prod /
```

### TODO:

* Unit test important stuff like dynamic template output

* Rather than comparing changes with the previous commit, store deployed the commit sha in agent meta-data and diff between releases

* Once Buildkite supports it (allegedly soon...), initialise new pipelines automatically based on the `.buildkite/project.json`