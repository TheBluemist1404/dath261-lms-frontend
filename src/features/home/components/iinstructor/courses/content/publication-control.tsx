type Lesson = {
	id: string;
	title: string;
	description?: string;
	isPublished: boolean;
	contentType?: "text" | "video";
	content?: string;
	videoUrl?: string;
};

type LessonListProps = {
	lessons: Lesson[];
	loading: boolean;
	error: string | null;
	onCreateLesson: () => void;
	onEditLesson: (lessonId: string) => void;
	onDeleteLesson: (lessonId: string) => void;
	onTogglePublishLesson: (lessonId: string, published: boolean) => void;
};

export function LessonList({
	lessons,
	loading,
	error,
	onCreateLesson,
	onEditLesson,
	onDeleteLesson,
	onTogglePublishLesson,
}: LessonListProps) {
	if (loading) {
		return <p>Loading lessons...</p>;
	}

	if (error) {
		return <p role="alert">{error}</p>;
	}

	return (
		<section>
			<h2>Lessons</h2>

			<button type="button" onClick={onCreateLesson}>
				Create Lesson
			</button>

			{lessons.length === 0 ? (
				<p>No lessons found.</p>
			) : (
				lessons.map((lesson) => (
					<article key={lesson.id}>
						<h3>{lesson.title}</h3>
						{lesson.description && <p>{lesson.description}</p>}

						{lesson.contentType === "text" && <p>{lesson.content}</p>}

						{lesson.contentType === "video" && lesson.videoUrl && (
							<a href={lesson.videoUrl} target="_blank" rel="noreferrer">
								Open video
							</a>
						)}

						<p>{lesson.isPublished ? "Published" : "Draft"}</p>

						<button type="button" onClick={() => onEditLesson(lesson.id)}>
							Edit
						</button>

						<button type="button" onClick={() => onDeleteLesson(lesson.id)}>
							Delete
						</button>

						<button
							type="button"
							onClick={() =>
								onTogglePublishLesson(lesson.id, !lesson.isPublished)
							}
						>
							{lesson.isPublished ? "Unpublish" : "Publish"}
						</button>
					</article>
				))
			)}
		</section>
	);
}
