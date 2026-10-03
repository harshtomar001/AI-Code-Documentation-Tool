# DocuAI Projects Page

Drop the entire `Projects` folder inside your frontend `src/pages/` directory.

Expected path:

```text
src/
└── pages/
    └── Projects/
        ├── Projects.jsx
        ├── projects.css
        └── components/
            ├── Sidebar.jsx
            ├── Topbar.jsx
            ├── ProjectsHeader.jsx
            ├── ProjectToolbar.jsx
            ├── ProjectGrid.jsx
            ├── ProjectCard.jsx
            ├── EmptyState.jsx
            └── NewProjectModal.jsx
```

Add the route in `AppRoutes.jsx`:

```jsx
import Projects from "../pages/Projects/Projects";

<Route path="/projects" element={<Projects />} />
```

On the Dashboard, make the Recent Projects `View All` action navigate to:

```jsx
navigate("/projects")
```

The page loads projects from `GET /api/projects` and sends create/duplicate/delete requests to the project API. It uses the access token already stored by the existing login flow.

The page keeps the same visual language as the supplied standalone Projects page: dark background, coral/red primary action, 3-column project grid, filters, search, sorting, grid/list switcher, cards, and modal.
