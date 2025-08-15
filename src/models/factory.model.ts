export interface Factory {
    id: number;
    factory_name: string;
    db_name: string;
    db_host: string;
    db_port: number;
    db_user: string;
    db_password: string;
    is_active: boolean;
    max_connections: number;
    created_at: Date;
    updated_at: Date;
}

export interface FactoryCreateParams {
    factory_name: string;
    db_name: string;
    db_host?: string;
    db_port?: number;
    db_user: string;
    db_password: string;
    is_active?: boolean;
    max_connections?: number;
}

export interface FactoryUpdateParams {
    factory_name?: string;
    db_name?: string;
    db_host?: string;
    db_port?: number;
    db_user?: string;
    db_password?: string;
    is_active?: boolean;
    max_connections?: number;
}