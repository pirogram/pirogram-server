CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email CHARACTER VARYING(256) NOT NULL UNIQUE,
    name CHARACTER VARYING(256),
    avatar CHARACTER VARYING(256),
    active BOOLEAN,
    superuser BOOLEAN,
    created_at TIMESTAMP WITHOUT TIME ZONE,
    updated_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE study_queue (
    user_id INTEGER NOT NULL,
    module_code CHARACTER VARYING(256) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (user_id, module_code)
);

CREATE TABLE code_playground_data (
    user_id integer NOT NULL,
    playground_id character varying(48) NOT NULL,
    code text NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    PRIMARY KEY (user_id, playground_id)
);

CREATE TABLE exercise_history (
    user_id integer NOT NULL,
    exercise_id character varying(1024) NOT NULL,
    solution jsonb,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    PRIMARY KEY (user_id, exercise_id)
);

CREATE TABLE topic_history (
    user_id integer NOT NULL,
    topic_id CHARACTER VARYING(1024) NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    PRIMARY KEY (user_id, topic_id)
);

CREATE TABLE exercise_solution_counter (
    exercise_id character varying(1024) NOT NULL,
    counter integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    PRIMARY KEY (exercise_id)
);

CREATE TABLE last_topic_marker (
    user_id integer NOT NULL,
    book_code CHARACTER VARYING(1024) NOT NULL,
    package_code CHARACTER VARYING(1024) NOT NULL,
    topic_code CHARACTER VARYING(1024) NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    PRIMARY KEY (user_id, book_code)
);

ALTER TABLE last_topic_marker DROP COLUMN package_code;