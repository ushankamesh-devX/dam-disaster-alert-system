package com.ddas.api.dto.request;

import com.ddas.api.entity.AlertType;
import lombok.Data;

/**
 * Criteria for bulk alert operations (resolve or escalate).
 * At least one of damId or severity must be provided (validated in the service).
 */
@Data
public class BulkAlertActionRequestDTO {

    /** Filter alerts belonging to a specific dam. */
    private Long damId;

    /** Filter alerts of a specific severity level. */
    private AlertType.AlertSeverity severity;
}
