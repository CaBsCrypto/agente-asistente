import{neon}from"@neondatabase/serverless";import{drizzle}from"drizzle-orm/neon-http";import*as schema from"./schema";
export function hasDatabase(){return Boolean(process.env.DATABASE_URL)}
export function getDb(){const url=process.env.DATABASE_URL;if(!url)throw new Error("database_not_configured");return drizzle(neon(url),{schema})}
