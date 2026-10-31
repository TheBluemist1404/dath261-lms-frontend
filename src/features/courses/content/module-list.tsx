type ModuleItem = {
	id: string;
	title: string;
	description?: string;
};

type ModuleListProps = {
	modules: ModuleItem[];
	loading: boolean;
	error: string | null;
	onCreateModule: () => void;
	onEditModule: (moduleId: string) => void;
	onDeleteModule: (moduleId: string) => void;
	onCreateLesson: (moduleId: string) => void;
};

export function ModuleList({
	modules,
	loading,
	error,
	onCreateModule,
	onEditModule,
	onDeleteModule,
	onCreateLesson,
}: ModuleListProps) {
	if (loading) {
		return <p>Loading modules...</p>;
	}

	if (error) {
		return <p role="alert">{error}</p>;
	}

	return (
		<section>
			<h2>Course Modules</h2>

			<button type="button" onClick={onCreateModule}>
				Create Module
			</button>

			{modules.length === 0 ? (
				<p>No modules found.</p>
			) : (
				modules.map((module) => (
					<article key={module.id}>
						<h3>{module.title}</h3>

						{module.description && <p>{module.description}</p>}

						<button type="button" onClick={() => onEditModule(module.id)}>
							Edit
						</button>

						<button type="button" onClick={() => onDeleteModule(module.id)}>
							Delete
						</button>

						<button type="button" onClick={() => onCreateLesson(module.id)}>
							Create Lesson
						</button>
					</article>
				))
			)}
		</section>
	);
}
