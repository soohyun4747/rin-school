export type InstructorOption = {
	id: string;
	name: string | null;
	email: string | null;
};

export type EditableTimeWindow = {
        id?: string;
        day_of_week: number;
        start_time: string;
        end_time: string;
        instructor_id?: string | null;
        instructor_name?: string | null;
};
