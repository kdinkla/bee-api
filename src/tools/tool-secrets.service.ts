/**
 * Copyright 2024 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Loaded, ref } from '@mikro-orm/core';

import { AnyTool, Tool } from './entities/tool/tool.entity.js';
import { ToolSecret } from './entities/tool-secret.entity.js';
import { ToolSecret as ToolSecretDto } from './dtos/tool-secret.js';
import { toDto as toToolDto } from './tools.service.js';
import { ToolSecretsListQuery, ToolSecretsListResponse } from './dtos/tool-secrets-list.js';
import { ToolSecretCreateBody, ToolSecretCreateResponse } from './dtos/tool-secret-create.js';
import {
  ToolSecretUpdateBody,
  ToolSecretUpdateParams,
  ToolSecretUpdateResponse
} from './dtos/tool-secret-update.js';
import { ToolSecretReadParams, ToolSecretReadResponse } from './dtos/tool-secret-read.js';
import { ToolSecretDeleteParams, ToolSecretDeleteResponse } from './dtos/tool-secret-delete.js';

import { createDeleteResponse } from '@/utils/delete.js';
import { ORM } from '@/database.js';
import { createPaginatedResponse, getListCursor } from '@/utils/pagination.js';
import { getUpdatedValue } from '@/utils/update.js';

export function toDto(toolSecret: Loaded<ToolSecret, 'tool'>): ToolSecretDto {
  return {
    id: toolSecret.id,
    object: 'tool-secret',
    value: toolSecret.value,
    name: toolSecret.name,
    tool: toToolDto(toolSecret.tool.$ as AnyTool)
  };
}

export async function listToolSecrets({
  limit,
  after,
  before,
  order,
  order_by
}: ToolSecretsListQuery): Promise<ToolSecretsListResponse> {
  const cursor = await getListCursor<Loaded<ToolSecret, 'tool'>>(
    {},
    { limit, order, order_by, after, before, populate: ['tool'] },
    ORM.em.getRepository(ToolSecret)
  );
  return createPaginatedResponse(cursor, toDto);
}

export async function createToolSecret({
  name,
  value,
  tool_id
}: ToolSecretCreateBody): Promise<ToolSecretCreateResponse> {
  const tool = await ORM.em.getRepository(Tool).findOneOrFail({ id: tool_id });

  const toolSecret = new ToolSecret({
    name,
    value,
    tool: ref(tool)
  });

  await ORM.em.persistAndFlush(toolSecret);

  return toDto(toolSecret as Loaded<ToolSecret, 'tool'>);
}

export async function updateToolSecret({
  tool_id,
  ...body
}: ToolSecretUpdateBody & ToolSecretUpdateParams): Promise<ToolSecretUpdateResponse> {
  const toolSecret = await ORM.em
    .getRepository(ToolSecret)
    .findOneOrFail({ id: tool_id }, { populate: ['tool'] });

  toolSecret.name = getUpdatedValue(body.name, toolSecret.name);
  toolSecret.value = getUpdatedValue(body.value, toolSecret.value);
  if (tool_id) {
    const tool = await ORM.em.getRepository(Tool).findOneOrFail({ id: tool_id });
    toolSecret.tool = ref(tool);
  }

  await ORM.em.flush();

  return toDto(toolSecret);
}

export async function readToolSecret({
  tool_secret_id
}: ToolSecretReadParams): Promise<ToolSecretReadResponse> {
  const toolSecret = await ORM.em
    .getRepository(ToolSecret)
    .findOneOrFail({ id: tool_secret_id }, { populate: ['tool'] });
  return toDto(toolSecret);
}

export async function deleteToolSecret({
  tool_secret_id
}: ToolSecretDeleteParams): Promise<ToolSecretDeleteResponse> {
  const toolSecret = await ORM.em.getRepository(ToolSecret).findOneOrFail({ id: tool_secret_id });

  toolSecret.delete();
  await ORM.em.flush();

  return createDeleteResponse(tool_secret_id, 'tool-secret');
}
