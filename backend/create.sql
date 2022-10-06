CREATE TABLE Folders(
    id serial primary key,
    name text not null,
    parent_id integer
);

CREATE TABLE Files(
    id serial primary key,
    name text not null,
    type text not null,
    content text,
    folder_id integer REFERENCES Folders (id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE NestingFolders(
    parent_id integer REFERENCES Folders(id) ON UPDATE CASCADE ON DELETE CASCADE,
    child_id integer REFERENCES Folders(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT nesting_folder_pkey PRIMARY KEY (parent_id, child_id)
    )